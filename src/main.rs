extern crate emscripten_sys;
extern crate gleam;

use emscripten_sys::{emscripten_GetProcAddress, emscripten_exit_with_live_runtime,
                     emscripten_webgl_init_context_attributes, emscripten_webgl_create_context,
                     emscripten_webgl_make_context_current, EmscriptenWebGLContextAttributes};

use gleam::gl;
use gleam::gl::{GLenum, GLuint};
use std::os::raw::c_char;
use std::ffi::CStr;
use std::ffi::CString;

type GlPtr = std::rc::Rc<gl::Gl>;

#[derive(Clone)]
pub struct SJContext {
    sj: SJ,
}

#[derive(Clone)]
pub struct SJ {
    gl: GlPtr,
    vs: GLuint,
    fs: GLuint,
    program: GLuint,
    start_time: std::time::Instant,
}

fn gleam_emscripten_init() -> GlPtr {
    unsafe {
        gl::GlesFns::load_with(|addr| {
            let addr = std::ffi::CString::new(addr).unwrap();
            emscripten_GetProcAddress(addr.into_raw() as *const _) as *const _
        })
    }
}

fn my_string_safe(i: *mut c_char) -> String {
    unsafe { CStr::from_ptr(i).to_string_lossy().into_owned() }
}

impl SJContext {
    pub fn new(gl: GlPtr) -> SJContext {
        SJContext { sj: SJ::new(gl) }
    }
}

fn load_shader(gl: &GlPtr, shader_type: GLenum, source: &[&[u8]]) -> Result<GLuint, String> {
    let shader = gl.create_shader(shader_type);
    if shader == 0 {
        return Err(String::from("gl.create_shader failed"));
    }
    gl.shader_source(shader, source);
    gl.compile_shader(shader);
    let compiled = gl.get_shader_iv(shader, gl::COMPILE_STATUS);
    if compiled == 0 {
        let log = gl.get_shader_info_log(shader);
        gl.delete_shader(shader);
        return Err(log);
    }
    Ok(shader)
}

impl SJ {
    pub fn new(gl: GlPtr) -> SJ {
        SJ {
            gl: gl,
            vs: 0,
            fs: 0,
            program: 0,
            start_time: std::time::Instant::now(),
        }
    }

    pub fn set_program(&mut self, vs_src: &[u8], fs_src: &[u8]) -> Result<(), String> {
        let gl = &self.gl;
        let old_vs_shader = self.vs;
        let new_vs_shader = try!(load_shader(gl, gl::VERTEX_SHADER, &[vs_src]));
        let old_fs_shader = self.fs;
        let new_fs_shader = try!(load_shader(gl, gl::FRAGMENT_SHADER, &[fs_src]));

        let old_program = self.program;
        let new_program = gl.create_program();

        gl.attach_shader(new_program, new_vs_shader);
        gl.attach_shader(new_program, new_fs_shader);
        gl.link_program(new_program);

        gl.delete_shader(old_vs_shader);
        gl.delete_shader(old_fs_shader);
        gl.delete_program(old_program);

        self.vs = new_vs_shader;
        self.fs = new_fs_shader;
        self.program = new_program;
        Ok(())
    }

    pub fn set_vertex_shader(&mut self, src: &[u8]) -> Result<(), String> {
        let gl = &self.gl;
        let old_shader = self.vs;
        let new_shader = try!(load_shader(gl, gl::VERTEX_SHADER, &[src]));

        let old_program = self.program;
        let new_program = gl.create_program();

        gl.attach_shader(new_program, new_shader);
        gl.attach_shader(new_program, self.fs);
        gl.link_program(new_program);
        gl.delete_shader(old_shader);
        gl.delete_program(old_program);
        self.vs = new_shader;
        self.program = new_program;
        Ok(())
    }

    pub fn set_fragment_shader(&mut self, src: &[u8]) -> Result<(), String> {
        let gl = &self.gl;
        let old_shader = self.fs;
        let new_shader = try!(load_shader(gl, gl::FRAGMENT_SHADER, &[src]));

        let old_program = self.program;
        let new_program = gl.create_program();

        gl.attach_shader(new_program, new_shader);
        gl.attach_shader(new_program, self.vs);
        gl.link_program(new_program);
        gl.delete_shader(old_shader);
        gl.delete_program(old_program);

        self.fs = new_shader;
        self.program = new_program;
        Ok(())
    }

    pub fn draw(&mut self, width: i32, height: i32) {
        if self.program == 0 {
            return;
        }
        let gl = &self.gl;
        let now = std::time::Instant::now();
        let i_time = now - self.start_time;
        let i_time_loc = gl.get_uniform_location(self.program, "iTime");
        let i_time = i_time.as_secs() as f32 + i_time.subsec_nanos() as f32 / 1_000_000_000.0;
        let i_resolution_loc = gl.get_uniform_location(self.program, "iResolution");

        gl.viewport(0, 0, width, height);
        gl.clear(gl::COLOR_BUFFER_BIT);
        gl.use_program(self.program);
        gl.uniform_1f(i_time_loc, i_time);
        gl.uniform_3f(i_resolution_loc, width as f32, height as f32, 1.0);
        gl.draw_arrays(gl::TRIANGLES, 0, 3);
    }
}

fn main() {
    unsafe {
        emscripten_exit_with_live_runtime();
    }
}

#[no_mangle]
pub extern "C" fn sj_create_webgl_context() {
    unsafe {
        let mut attributes: EmscriptenWebGLContextAttributes = std::mem::uninitialized();
        emscripten_webgl_init_context_attributes(&mut attributes);
        attributes.majorVersion = 2;
        let handle = emscripten_webgl_create_context(std::ptr::null(), &attributes);
        emscripten_webgl_make_context_current(handle);
    }
}

#[no_mangle]
pub extern "C" fn sj_emscripten_init() -> *mut SJ {
    let r = Box::new(SJ::new(gleam_emscripten_init()));
    Box::into_raw(r)
}

#[no_mangle]
pub extern "C" fn sj_destroy(r: *mut SJ) {
    unsafe {
        let _r = Box::from_raw(r);
    }
}

#[no_mangle]
pub extern "C" fn sj_set_program(
    r: *mut SJ,
    vs_src: *mut c_char,
    fs_src: *mut c_char,
) -> *mut c_char {
    let vs_data = my_string_safe(vs_src);
    let fs_data = my_string_safe(fs_src);
    let result = unsafe {
        let mut r = Box::from_raw(r);
        let result = r.set_program(vs_data.as_bytes(), fs_data.as_bytes());
        std::mem::forget(r);
        result
    };
    match result {
        Err(e) => unsafe {
            return CString::from_vec_unchecked(e.as_bytes().to_vec()).into_raw();
        },
        Ok(_) => return CString::new("").unwrap().into_raw(),
    };
}

#[no_mangle]
pub extern "C" fn sj_set_vertex_shader(r: *mut SJ, src: *mut c_char) -> *mut c_char {
    let data = my_string_safe(src);
    let result = unsafe {
        let mut r = Box::from_raw(r);
        let result = r.set_vertex_shader(data.as_bytes());
        std::mem::forget(r);
        result
    };
    match result {
        Err(e) => unsafe {
            return CString::from_vec_unchecked(e.as_bytes().to_vec()).into_raw();
        },
        Ok(_) => return CString::new("").unwrap().into_raw(),
    };
}

#[no_mangle]
pub extern "C" fn sj_set_fragment_shader(r: *mut SJ, src: *mut c_char) -> *mut c_char {
    let data = my_string_safe(src);
    let result = unsafe {
        let mut r = Box::from_raw(r);
        let result = r.set_fragment_shader(data.as_bytes());
        std::mem::forget(r);
        result
    };
    match result {
        Err(e) => unsafe {
            return CString::from_vec_unchecked(e.as_bytes().to_vec()).into_raw();
        },
        Ok(_) => return CString::new("").unwrap().into_raw(),
    };
}

#[no_mangle]
pub extern "C" fn sj_draw(r: *mut SJ, width: i32, height: i32) {
    unsafe {
        let mut r = Box::from_raw(r);
        r.draw(width, height);
        std::mem::forget(r);
    }
}
