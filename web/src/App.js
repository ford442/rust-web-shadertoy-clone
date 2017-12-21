import './App.css';
import Config from './Config.js';

import GoldenLayout from 'golden-layout';
import React from 'react';
import ReactDOM from 'react-dom';

import Editor from './Editor';
import Viewer from './Viewer';

const default_vs_src = `#version 300 es

out vec2 texCoord;

void main()
{
    float x = -1.0 + float((gl_VertexID & 1) << 2);
    float y = -1.0 + float((gl_VertexID & 2) << 1);
    texCoord.x = (x+1.0)*0.5;
    texCoord.y = (y+1.0)*0.5;
    gl_Position = vec4(x, y, 0, 1);
}
`;

const default_fs_src = `#version 300 es
precision mediump float;

// uniforms
uniform float iTime;
uniform vec3 iResolution;
uniform vec4 iMouse;

// in vars
in vec2 texCoord;

// out vars
out vec4 fragColor;

void mainImage(out vec4 fragColor, in vec2 fragCoord);

void main() {
  mainImage(fragColor, gl_FragCoord.xy);
}

// YOUR CODE
//
// Created by inigo quilez - iq/2013
// License Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License.


// See also:
//
// Input - Keyboard    : https://www.shadertoy.com/view/lsXGzf
// Input - Microphone  : https://www.shadertoy.com/view/llSGDh
// Input - Mouse       : https://www.shadertoy.com/view/Mss3zH
// Input - Sound       : https://www.shadertoy.com/view/Xds3Rr
// Input - SoundCloud  : https://www.shadertoy.com/view/MsdGzn
// Input - Time        : https://www.shadertoy.com/view/lsXGz8
// Input - TimeDelta   : https://www.shadertoy.com/view/lsKGWV
// Inout - 3D Texture  : https://www.shadertoy.com/view/4llcR4


float distanceToSegment( vec2 a, vec2 b, vec2 p )
{
	vec2 pa = p - a, ba = b - a;
	float h = clamp( dot(pa,ba)/dot(ba,ba), 0.0, 1.0 );
	return length( pa - ba*h );
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
	vec2 p = fragCoord.xy / iResolution.xx;
    vec4 m = iMouse / iResolution.xxxx;

	vec3 col = vec3(0.0);

	if( m.z>0.0 )
	{
		float d = distanceToSegment( m.xy, m.zw, p );
    col = mix( col, vec3(1.0,1.0,0.0), 1.0-smoothstep(.004,0.008, d) );
	}

	col = mix( col, vec3(1.0,0.0,0.0), 1.0-smoothstep(0.03,0.035, length(p-m.xy)) );
  col = mix( col, vec3(0.0,0.0,1.0), 1.0-smoothstep(0.03,0.035, length(p-abs(m.zw))) );

	fragColor = vec4( col, 1.0 );
}`;


class App extends React.PureComponent {
  constructor(props) {
    super(props);
    const vs = localStorage.getItem("vs") || default_vs_src;
    const fs = localStorage.getItem("fs") || default_fs_src;
    this.state = {
      vs: vs,
      fs: fs
    };
  }

  componentDidMount() {
    const app = this;

    fetch('shaderjob.wasm')
      .then((response) => response.arrayBuffer())
      .then((buffer) => {
        // create the emscripten module,
        // attach it to the global window
        const canvas = document.getElementById(Config.canvasId);
        window.Module = {};
        window.Module.canvas = canvas;
        window.Module.wasmBinary = buffer;
        window.Module.onRuntimeInitialized = () => {
          window.Module.sj = {};
          const SJ = window.Module.sj;
          SJ.ffi = {};
          SJ.ffi.create_webgl_context = window.Module.cwrap('sj_create_webgl_context', null, []);
          SJ.ffi.init                 = window.Module.cwrap('sj_emscripten_init', 'number', []);
          SJ.ffi.destroy              = window.Module.cwrap('sj_destroy', null, ['number']);
          SJ.ffi.set_program          = window.Module.cwrap('sj_set_program', 'string', ['number', 'string', 'string']);
          SJ.ffi.set_vertex_shader    = window.Module.cwrap('sj_set_vertex_shader', 'string', ['number', 'string']);
          SJ.ffi.set_fragment_shader  = window.Module.cwrap('sj_set_fragment_shader', 'string', ['number', 'string']);
          SJ.ffi.draw                 = window.Module.cwrap('sj_draw', null, ['number']);
          SJ.ffi.set_canvas_size      = window.Module.cwrap('sj_set_canvas_size', null, ['number', 'number', 'number']);
          SJ.ffi.set_mouse            = window.Module.cwrap('sj_set_mouse', null, ['number', 'number', 'number']);
          SJ.ffi.set_mouse_up         = window.Module.cwrap('sj_set_mouse_up', null, ['number', 'number', 'number']);
          SJ.ffi.set_mouse_down       = window.Module.cwrap('sj_set_mouse_down', null, ['number', 'number', 'number']);
          SJ.ffi.play                 = window.Module.cwrap('sj_play', null, ['number']);
          SJ.ffi.pause                = window.Module.cwrap('sj_pause', null, ['number']);
          SJ.ffi.restart              = window.Module.cwrap('sj_restart', null, ['number']);

          SJ.set_program = (vs, fs) => {
            const ctx = SJ.ctx;
            return SJ.ffi.set_program(ctx, vs, fs);
          };
          SJ.set_vertex_shader = (s) => {
            const ctx = SJ.ctx;
            return SJ.ffi.set_vertex_shader(ctx, s);
          };
          SJ.set_fragment_shader = (s) => {
            const ctx = SJ.ctx;
            return SJ.ffi.set_fragment_shader(ctx, s);
          };
          SJ.draw = () => {
            const ctx = SJ.ctx;
            SJ.ffi.draw(ctx);
          };
          SJ.set_canvas_size = (w, h) => {
            const ctx = SJ.ctx;
            SJ.ffi.set_canvas_size(ctx, w, h);
          };
          SJ.set_mouse = (x, y) => {
            const ctx = SJ.ctx;
            SJ.ffi.set_mouse(ctx, x, y);
          };
          SJ.set_mouse_down = (x, y) => {
            const ctx = SJ.ctx;
            SJ.ffi.set_mouse_down(ctx, x, y);
          };
          SJ.set_mouse_up = (x, y) => {
            const ctx = SJ.ctx;
            SJ.ffi.set_mouse_up(ctx, x, y);
          };
          SJ.play = () => {
            const ctx = SJ.ctx;
            SJ.ffi.play(ctx);
          };
          SJ.pause = () => {
            const ctx = SJ.ctx;
            SJ.ffi.pause(ctx);
          };
          SJ.restart = () => {
            const ctx = SJ.ctx;
            SJ.ffi.restart(ctx);
          };

          // return the mouse position in pixel
          // space
          const getMousePos = (canvas, evt) => {
            const rect = canvas.getBoundingClientRect();
            const el_x = evt.clientX - rect.left;
            const el_y = evt.clientY - rect.top;
            const norm_x = el_x / rect.width;
            const norm_y = el_y / rect.height;
            const px_x = norm_x * canvas.width;
            const px_y = norm_y * canvas.height;
            return {
              x: px_x,
              y: px_y,
            };
          };

          const onMouseMove = (e) => {
            const c = window.Module.canvas;
            const pos = getMousePos(c, e);
            SJ.set_mouse(pos.x, c.height - pos.y);
          };

          const onMouseDown = (e) => {
            const c = window.Module.canvas;
            const pos = getMousePos(c, e);
            SJ.set_mouse_down(pos.x, c.height - pos.y);
          };

          const onMouseUp = (e) => {
            const c = window.Module.canvas;
            const pos = getMousePos(c, e);
            SJ.set_mouse_up(pos.x, c.height - pos.y);
          };

          window.Module.canvas.addEventListener('mousemove', onMouseMove, false);
          window.Module.canvas.addEventListener('mousedown', onMouseDown, false);
          window.Module.canvas.addEventListener('mouseup', onMouseUp, false);

          const loop = () => {
            const c = window.Module.canvas;
            SJ.set_canvas_size(c.width, c.height);
            SJ.draw();
            window.requestAnimationFrame(loop);
          };

          SJ.ffi.create_webgl_context();
          SJ.ctx = SJ.ffi.init();
          const err = SJ.set_program(app.state.vs, app.state.fs);
          if (err) {
            console.log(err);
          }
          window.requestAnimationFrame(loop);
        };

        // script
        const script = document.createElement('script');
        document.body.appendChild(script);
        script.src = "shaderjob.js";
      });

    const onVertChange = (s) => {
      app.setState((prev, props) => {
        return {
          vs: s,
          fs: prev.fs
        };
      });
      localStorage.setItem("vs", s);
      return window.Module.sj.set_vertex_shader(s);
    };

    const onFragChange = (s) => {
      app.setState((prev, props) => {
        return {
          vs: prev.vs,
          fs: s
        };
      });
      localStorage.setItem("fs", s);
      return window.Module.sj.set_fragment_shader(s);
    };

    const config = {
      settings: {
        hasHeaders: true,
        constrainDragToContainer: true,
        reorderEnabled: true,
        selectionEnabled: false,
        popoutWholeStack: false,
        showPopoutIcon: false,
        showMaximiseIcon: true,
        showCloseIcon: false
      },
      content: [{
        type: 'row',
        content: [{
            type: 'stack',
            activeItemIndex: 1,
            content: [
            {
              type: 'react-component',
              component: 'Editor',
              props: {
                title: "vertex",
                value: this.state.vs,
                onChange: onVertChange
              }
            },
            {
              type: 'react-component',
              component: 'Editor',
              props: {
                title: "fragment",
                value: this.state.fs,
                onChange: onFragChange
              },
            }
            ]},
          {type: 'react-component',
            component: 'Viewer'
          },
        ]
      }]
    };

    this.layout = new GoldenLayout(config, this.domNode);
    this.layout.registerComponent('Editor', Editor);
    this.layout.registerComponent('Viewer', Viewer);
    this.layout.init();

    // TODO(jshrake): ensure React and ReactDOM are
    // in the global scope for goldenlayout
    window.React = React;
    window.ReactDOM = ReactDOM;
    window.addEventListener('resize', () => {
      this.layout.updateSize();
    });
  }

  render() {
    return (
      <div style = {
      { height: '100vh' }} ref = {
      input => this.domNode = input
    } />
    );
  }
}

export default App;
