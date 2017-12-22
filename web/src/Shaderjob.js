export async function shaderjobInit(onRuntimeInitialized) {
  const res = await fetch("shaderjob.wasm");
  const buffer = await res.arrayBuffer();
  window.Module = window.Module || {};
  window.Module.wasmBinary = buffer;
  window.Module.onRuntimeInitialized = onRuntimeInitialized;

  const script = document.createElement('script');
  document.body.appendChild(script);
  script.src = "shaderjob.js";
}

export default class Shaderjob {
  constructor(canvas_element, gl_major) {
    const module = window.Module;
    this.ffi = {};
    this.ffi.init                 = module.cwrap('sj_init', 'number', ['string', 'number']);
    this.ffi.destroy              = module.cwrap('sj_destroy', null, ['number']);
    this.ffi.set_program          = module.cwrap('sj_set_program', 'string', ['number', 'string', 'string']);
    this.ffi.set_vertex_shader    = module.cwrap('sj_set_vertex_shader', 'string', ['number', 'string']);
    this.ffi.set_fragment_shader  = module.cwrap('sj_set_fragment_shader', 'string', ['number', 'string']);
    this.ffi.draw                 = module.cwrap('sj_draw', null, ['number']);
    this.ffi.set_canvas_size      = module.cwrap('sj_set_canvas_size', null, ['number', 'number', 'number']);
    this.ffi.set_mouse            = module.cwrap('sj_set_mouse', null, ['number', 'number', 'number']);
    this.ffi.set_mouse_up         = module.cwrap('sj_set_mouse_up', null, ['number', 'number', 'number']);
    this.ffi.set_mouse_down       = module.cwrap('sj_set_mouse_down', null, ['number', 'number', 'number']);
    this.ffi.play                 = module.cwrap('sj_play', null, ['number']);
    this.ffi.pause                = module.cwrap('sj_pause', null, ['number']);
    this.ffi.restart              = module.cwrap('sj_restart', null, ['number']);
    this.ctx = this.ffi.init(canvas_element, gl_major);
  }

  set_program(vs, fs) {
    return this.ffi.set_program(this.ctx, vs, fs);
  }

  set_vertex_shader(s) {
    return this.ffi.set_vertex_shader(this.ctx, s);
  }

  set_fragment_shader(s) {
    return this.ffi.set_fragment_shader(this.ctx, s);
  }

  draw() {
    this.ffi.draw(this.ctx);
  }

  set_canvas_size(w, h) {
    this.ffi.set_canvas_size(this.ctx, w, h);
  }

  set_mouse(x, y) {
    this.ffi.set_mouse(this.ctx, x, y);
  }

  set_mouse_down(x, y) {
     this.ffi.set_mouse_down(this.ctx, x, y);
  }

  set_mouse_up(x, y) {
     this.ffi.set_mouse_up(this.ctx, x, y);
  }

  play() {
    this.ffi.play(this.ctx);
  }

  pause() {
     this.ffi.pause(this.ctx);
  }

  restart() {
     this.ffi.restart(this.ctx);
  }
}
