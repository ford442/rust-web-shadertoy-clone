extern crate emscripten_sys;
extern crate gleam;

use emscripten_sys::{emscripten_set_main_loop, emscripten_GetProcAddress,
                     emscripten_webgl_init_context_attributes, emscripten_webgl_create_context,
                     emscripten_webgl_make_context_current, emscripten_get_element_css_size,
                     EmscriptenWebGLContextAttributes};
use gleam::gl;
use gleam::gl::{GLenum, GLuint};
use std::cell::RefCell;
use std::os::raw::c_char;
use std::ffi::CStr;
use std::ffi::CString;

type GlPtr = std::rc::Rc<gl::Gl>;

#[derive(Clone)]
struct Context {
    viewer: Viewer,
}

#[derive(Clone)]
struct Viewer {
    gl: GlPtr,
    program: GLuint,
    iTime: std::time::Instant,
    iProgramTime: std::time::Instant,
}

impl Context {
    fn new(gl: GlPtr) -> Context {
        Context { viewer: Viewer::new(gl) }
    }
}

impl Viewer {
    pub fn new(gl: GlPtr) -> Viewer {
        let now = std::time::Instant::now();
        Viewer {
            gl: gl,
            program: 0,
            iTime: now,
            iProgramTime: now,
        }
    }

    pub fn set_program(&mut self, source: &[u8]) -> Result<(), String> {
        let gl = &self.gl;
        let old_program = self.program;
        let f_shader = try!(load_shader(gl, gl::FRAGMENT_SHADER, &[source]));
        let v_shader = try!(load_shader(gl, gl::VERTEX_SHADER, &[VS_SRC]));
        self.program = gl.create_program();
        gl.attach_shader(self.program, v_shader);
        gl.attach_shader(self.program, f_shader);
        gl.link_program(self.program);
        gl.delete_shader(v_shader);
        gl.delete_shader(f_shader);
        gl.delete_program(old_program);
        Ok(())
    }

    pub fn draw(&self, width: u32, height: u32) {
        let gl = &self.gl;
        let now = std::time::Instant::now();
        let iTime = now - self.iTime;
        let iProgramTime = now - self.iProgramTime;
        gl.viewport(0, 0, width as i32, height as i32);
        gl.clear(gl::COLOR_BUFFER_BIT);
        gl.use_program(self.program);
        let i_time_loc = gl.get_uniform_location(self.program, "iTime");
        let i_time_s = iTime.as_secs() as f32 + iTime.subsec_nanos() as f32 / 1_000_000_000.0;

        gl.uniform_1f(i_time_loc, i_time_s);
        gl.draw_arrays(gl::TRIANGLES, 0, 3);
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


// emscripten

thread_local! {
    static CONTEXT : RefCell<Option<Context>> = RefCell::new(None);
}

fn my_string_safe(i: *mut c_char) -> String {
    unsafe { CStr::from_ptr(i).to_string_lossy().into_owned() }
}


#[no_mangle]
pub extern "C" fn set_program(i: *mut c_char) -> *mut c_char {
    let data = my_string_safe(i);
    let result: Result<_, String> = CONTEXT.with(|ctxref| {
        ctxref
            .borrow_mut()
            .as_mut()
            .map(|ctx| ctx.viewer.set_program(data.as_bytes()))
            .unwrap()
    });
    match result {
        Ok(_) => return CString::new("").unwrap().into_raw(),
        Err(e) => unsafe {
            return CString::from_vec_unchecked(e.as_bytes().to_vec()).into_raw();
        },
    }
}

extern "C" fn loop_wrapper() {
    let (w, h) = get_canvas_size();
    CONTEXT.with(|ctxref| {
        ctxref.borrow().as_ref().unwrap().viewer.draw(w, h);
    });
}

fn get_canvas_size() -> (u32, u32) {
    unsafe {
        let mut width = std::mem::uninitialized();
        let mut height = std::mem::uninitialized();
        emscripten_get_element_css_size(std::ptr::null(), &mut width, &mut height);
        (width as u32, height as u32)
    }
}

fn main() {
    unsafe {
        let mut attributes: EmscriptenWebGLContextAttributes = std::mem::uninitialized();
        emscripten_webgl_init_context_attributes(&mut attributes);
        attributes.majorVersion = 2;
        let handle = emscripten_webgl_create_context(std::ptr::null(), &attributes);
        emscripten_webgl_make_context_current(handle);
        let gl = gl::GlesFns::load_with(|addr| {
            let addr = std::ffi::CString::new(addr).unwrap();
            emscripten_GetProcAddress(addr.into_raw() as *const _) as *const _
        });
        CONTEXT.with(|ctxref| { *ctxref.borrow_mut() = Some(Context::new(gl)); });
        CONTEXT.with(|ctxref| {
            ctxref.borrow_mut().as_mut().map(|ctx| {
                ctx.viewer.set_program(FS_SRC).unwrap();
            });
        });
        emscripten_set_main_loop(Some(loop_wrapper), 0, 1);
    }
}

const VS_SRC: &'static [u8] = b"#version 300 es

out vec2 texCoord;
void main()
{
    float x = -1.0 + float((gl_VertexID & 1) << 2);
    float y = -1.0 + float((gl_VertexID & 2) << 1);
    texCoord.x = (x+1.0)*0.5;
    texCoord.y = (y+1.0)*0.5;
    gl_Position = vec4(x, y, 0, 1);
}
";

const FS_SRC: &'static [u8] = b"#version 300 es
precision mediump float;
in vec2 texCoord;
out vec4 out_fragColor;
void main() {
    out_fragColor = vec4(1.0, 0.0, 0.0, 1.0);
}
";
