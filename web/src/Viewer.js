import './Viewer.css';

import React, {Component} from 'react';

class Viewer extends Component {
  componentDidMount() {
    this.props.glContainer.setTitle('View');
    fetch('shaderjob.wasm')
      .then((response) => response.arrayBuffer())
      .then((buffer) => {
        window.Module = {};
        window.Module.wasmBinary = buffer
        window.Module.canvas = document.getElementById('viewer-canvas');
        var script = document.createElement('script')
        script.src = "shaderjob.js"
        document.body.appendChild(script)
      });
  }

  render() { return (<div><canvas id = 'viewer-canvas' /></ div>); }
}

export default Viewer;
