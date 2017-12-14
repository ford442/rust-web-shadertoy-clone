import './App.css';

import GoldenLayout from 'golden-layout';
import React from 'react';
import ReactDOM from 'react-dom';

import Editor from './Editor';
import Viewer from './Viewer';

class App extends React.PureComponent {
  componentDidMount() {
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
        content: [
          {type: 'react-component', component: 'Editor'},
          {type: 'react-component', component: 'Viewer'},
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
