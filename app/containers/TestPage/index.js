import React, { Component } from 'react';
// import claraplayer from '../../vendor/claraplayer';
// const claraplayer = require('../../../vendor/claraplayer');
// const {deps} = claraplayer;

export default class TestPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      clara: null,
    };
  }
  componentDidMount() {
    const clara = claraplayer(this.refs.claraplayer);
    clara.sceneIO.fetchAndUse('0cd9a9a2-c113-4b0d-ae91-baa86d3ded4a').then(() =>
      this.setState({
        clara: clara,
      })
    );
    ['orbit', 'pan', 'zoom', 'home', 'fullscreen'].forEach(
      function(tool) {
        clara.player.hideTool(tool);
      }
    );
  }
  componentDidUpdate() {
    this.state.clara.player.resize();
  }


  importScene(sceneId){
    
    var api = this.state.clara;
    var numImports = 0;
    api.sceneIO.fetch(sceneId).then(function() {
      var newObjectsId = api.scene.find({ from: { id: sceneId }, name: 'Objects' });
      var nodes = api.scene.filter({ from: { id: newObjectsId }, type: ['PolyMesh','BinMesh','Null'] });
      var objectsId = api.scene.find({ type: 'Objects' });

      api.sceneGraph.addNode({
        name: 'Import Null',
        parent: objectsId,
        type: 'Null',
        plugs: {
          Transform: [['Transform', {translation: {x: 0, y: (numImports+1)/2, z: 0}}]],
        },
      }).then(function(nullNodeId) {
        api.sceneGraph.clone(nodes, {[newObjectsId]: nullNodeId}).then(function(nodeMap) {
          console.log('new nodes', nodeMap);
        });
      });
    });
  };

  render() {
    return (
      <div>
        <div ref="claraplayer" style={{ width: 800, height: 600 }}>
        </div>
        <div>
          <button onClick={(ev) => this.importScene('7f92faad-1cd0-4e75-b76c-c0c564e809f2')}>
            import
          </button>
        </div>
      </div>
    );
  }
}

TestPage.propTypes = {
  width: React.PropTypes.number,
  height: React.PropTypes.number,
};
