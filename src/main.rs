extern crate emscripten_sys;
extern crate gleam;

mod shaderjob;
pub use shaderjob::ffi::*;
use std::os::raw::c_char;

use emscripten_sys::{emscripten_GetProcAddress, emscripten_exit_with_live_runtime,
                     emscripten_webgl_init_context_attributes, emscripten_webgl_create_context,
                     emscripten_webgl_make_context_current, EmscriptenWebGLContextAttributes};

fn main() {
    unsafe {
        emscripten_exit_with_live_runtime();
    }
}

fn gleam_emscripten_init() -> shaderjob::GlPtr {
    unsafe {
        shaderjob::gl::GlesFns::load_with(|addr| {
            let addr = std::ffi::CString::new(addr).unwrap();
            emscripten_GetProcAddress(addr.into_raw() as *const _) as *const _
        })
    }
}

#[no_mangle]
pub extern "C" fn sj_init(canvas_element: *mut c_char, major_version: i32) -> *mut shaderjob::SJ {
    unsafe {
        let mut attributes: EmscriptenWebGLContextAttributes = std::mem::uninitialized();
        emscripten_webgl_init_context_attributes(&mut attributes);
        attributes.majorVersion = major_version;
        let handle = emscripten_webgl_create_context(canvas_element, &attributes);
        emscripten_webgl_make_context_current(handle);
    }
    let r = Box::new(shaderjob::SJ::new(gleam_emscripten_init()));
    Box::into_raw(r)
}
