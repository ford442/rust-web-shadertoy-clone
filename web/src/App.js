import './App.css';
import Config from './Config.js';

import GoldenLayout from 'golden-layout';
import React from 'react';
import ReactDOM from 'react-dom';

import Editor from './Editor';
import Viewer from './Viewer';

const default_vert_src = `#version 300 es

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

const default_frag_src = `#version 300 es
precision mediump float;

// uniforms
uniform float iTime;
uniform vec3 iResolution;

// in vars
in vec2 texCoord;

// out vars
out vec4 fragColor;

void mainImage(out vec4 fragColor, in vec2 fragCoord);

void main() {
  mainImage(fragColor, gl_FragCoord.xy);
}

// YOUR CODE

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
	vec2 uv = fragCoord.xy / iResolution.xy;
	fragColor = vec4(uv,0.5+0.5*sin(iTime),1.0);
}`;


class App extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      vs: default_vert_src,
      fs: default_frag_src
    };
  }

  componentDidMount() {
    fetch('shaderjob.wasm')
      .then((response) => response.arrayBuffer())
      .then((buffer) => {
        // create the emscripten module,
        // attach it to the global window
        window.Module = {};
        window.Module.wasmBinary = buffer;
        window.Module.canvas = document.getElementById(Config.canvasId);
        window.Module.onRuntimeInitialized = () => {
          window.Module.sj = {};
          const SJ = window.Module.sj;
          SJ.ffi = {};
          SJ.ffi.create_webgl_context= window.Module.cwrap('sj_create_webgl_context', null, []);
          SJ.ffi.init = window.Module.cwrap('sj_emscripten_init', 'number', []);
          SJ.ffi.destroy = window.Module.cwrap('sj_destroy', null, ['number']);
          SJ.ffi.set_program = window.Module.cwrap('sj_set_program', 'string', ['number', 'string', 'string']);
          SJ.ffi.set_vertex_shader= window.Module.cwrap('sj_set_vertex_shader', 'string', ['number', 'string']);
          SJ.ffi.set_fragment_shader= window.Module.cwrap('sj_set_fragment_shader', 'string', ['number', 'string']);
          SJ.ffi.draw= window.Module.cwrap('sj_draw', null, ['number', 'number', 'number']);

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
          SJ.draw = (w, h) => {
            const ctx = SJ.ctx;
            SJ.ffi.draw(ctx, w, h)
          };

          const loop = () => {
            SJ.draw(window.Module.canvas.width, window.Module.canvas.height);
            window.requestAnimationFrame(loop);
          };

          SJ.ffi.create_webgl_context();
          SJ.ctx = SJ.ffi.init();
          let err = SJ.set_program(default_vert_src, default_frag_src);
          if (err) {
            console.log("ERROR", err);
          }
          loop();
        };

        // script
        var script = document.createElement('script');
        document.body.appendChild(script);
        script.src = "shaderjob.js";
      });

    const app = this;

    const onVertChange = function(s) {
      app.setState((prev, props) => {
        return {
          vs: s,
          fs: prev.fs
        };
      });
      return window.Module.sj.set_vertex_shader(s);
    };

    const onFragChange = function(s) {
      app.setState((prev, props) => {
        return {
          vs: prev.vs,
          fs: s
        };
      });
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
