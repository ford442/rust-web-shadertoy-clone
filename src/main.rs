extern crate emscripten_sys;
extern crate gleam;

mod shaderjob;
pub use shaderjob::ffi::*;

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

// c interface
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
pub extern "C" fn sj_emscripten_init() -> *mut shaderjob::SJ {
    let r = Box::new(shaderjob::SJ::new(gleam_emscripten_init()));
    Box::into_raw(r)
}
