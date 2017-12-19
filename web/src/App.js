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

// in vars
in vec2 texCoord;

// out vars
out vec4 fragColor;

void main() {
  fragColor = vec4(texCoord, 0.5 * (1.0 + cos(iTime)), 1.0);
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

        // script
        var script = document.createElement('script');
        script.src = "shaderjob.js";
        document.body.appendChild(script);
      });

    let rowFromGlErr = function(e) {
      return 0;
    };

    const setProgram = function(v, f) {
      const set_program =
          window.Module.cwrap('set_program', 'string', ['string', 'string']);
      const err = set_program(v,f);
      const annotations = [];
      if (err) {
        const row = rowFromGlErr(err);
        annotations.push({row: row, column: 0, type: 'error', text: err});
      }
      return annotations;
    };

    const app = this;
    let onVertChange = function(s) {
      app.setState((prev, props) => {
        return {
          vs: s,
          fs: prev.fs
        };
      });
      return setProgram(s, app.state.fs);
    };
    let onFragChange = function(s) {
      app.setState((prev, props) => {
        return {
          vs: prev.vs,
          fs: s
        };
      });
      return setProgram(app.state.vs, s);
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
            content: [
            {
              type: 'react-component',
              component: 'Editor',
              props: {
                title: "vertex",
                value: this.state.vs,
                onChange: onVertChange
              },
              activeItemIndex: 0
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
