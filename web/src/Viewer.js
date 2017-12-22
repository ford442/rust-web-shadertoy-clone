import './Viewer.css';

import React, {PureComponent} from 'react';

import Shaderjob from './Shaderjob.js';
import {shaderjobInit} from './Shaderjob.js';

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

class Viewer extends PureComponent {
  componentDidMount() {
    this.props.glContainer.setTitle('View');
    this.canvas = document.getElementById(this.props.canvasId);

    const self = this;
    const onRuntimeInitialized = () => {
      const onMouseMove = (e) => {
        const pos = getMousePos(self.canvas, e);
        self.sj.set_mouse(pos.x, self.canvas.height - pos.y);
      };

      const onMouseDown = (e) => {
        const pos = getMousePos(self.canvas, e);
        self.sj.set_mouse_down(pos.x, self.canvas.height - pos.y);
      };

      const onMouseUp = (e) => {
        const pos = getMousePos(self.canvas, e);
        self.sj.set_mouse_up(pos.x, self.canvas.height - pos.y);
      };

      const loop = () => {
        self.sj.set_canvas_size(self.canvas.width, self.canvas.height);
        self.sj.draw();
        window.requestAnimationFrame(loop);
      };

      self.canvas.addEventListener('mousemove', onMouseMove, false);
      self.canvas.addEventListener('mousedown', onMouseDown, false);
      self.canvas.addEventListener('mouseup', onMouseUp, false);
      self.sj = new Shaderjob(window.Module, self.props.canvasId, 2);
      self.sj.set_program(self.props.vs, self.props.fs);
      window.requestAnimationFrame(loop);
    };
    shaderjobInit(onRuntimeInitialized);
  }

  render() { return (
    <div>
      <canvas width='640' height='480' id ={this.props.canvasId} />
    </ div>
    );
  }




}

export default Viewer;
