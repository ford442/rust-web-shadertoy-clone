import './Editor.css';

import React, {Component} from 'react';
import AceEditor from 'react-ace';

import 'brace/mode/glsl';
import 'brace/theme/monokai';

class Editor extends Component {
  constructor(props) {
    super(props);
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
    this.state = {annotations: [], src: default_frag_src};
  }

  componentDidMount() {
    this.props.glContainer.setTitle('Editor');
  }

  render() {
    const that = this;
    let onChange = function(s) {
      const set_program =
          window.Module.cwrap('set_program', 'string', ['string']);
      const result = set_program(s);
      const annotations = [];
      if (result) {
        annotations.push({row: 0, column: 0, type: 'error', text: result});
      }
      that.setState({annotations: annotations, src: s});
    };

    return (
        <AceEditor width = '100vw' height = '100vw' mode = 'glsl' theme =
             'monokai' name = 'editor' value = {this.state.src} editorProps = {
      { $blockScrolling: Infinity }
             } onChange = {onChange} annotations = {
      this.state.annotations} />);
  }
}

export default Editor;
