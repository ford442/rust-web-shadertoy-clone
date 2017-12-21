import './Viewer.css';
import Config from './Config.js';

import React, {Component} from 'react';

class Viewer extends Component {
  componentDidMount() {
    this.props.glContainer.setTitle('View');
  }

  render() { return (<div id="viewer-canvas-parent"><canvas width='640' height='480' id ={Config.canvasId} /></ div>); }
}

export default Viewer;
