import './Editor.css';

import React, {Component} from 'react';
import AceEditor from 'react-ace';

import 'brace/mode/glsl';
import 'brace/theme/monokai';

class Editor extends Component {
  constructor(props) {
    super(props);
    this.state = {
      annotations: [],
      value: this.props.value,
    };
  }

  componentDidMount() {
    this.props.glContainer.setTitle(this.props.title);
  }

  render() {

    const rowFromGlErr = function(e) {
      const re = /^ERROR:\s+\d+:(\d+)/;
      const match = re.exec(e);
      return parseInt(match[1], 10);
    };

    const that = this;
    const onChange = function(s) {
      const err = that.props.onChange(s);
      const annotations = [];
      if (err) {
        const row = rowFromGlErr(err);
        annotations.push({row: row - 1, column: 0, type: 'error', text: err});
      }
      that.setState({annotations: annotations, value: s});
    };


    return (
        <AceEditor width = '100vw' height = '100vw' mode = 'glsl' theme =
            'monokai' name = 'editor'
            value = {this.state.value}
            editorProps = {{ $blockScrolling: Infinity }}
            onChange = {onChange}
            annotations = {this.state.annotations}
      />);
  }
}

export default Editor;
