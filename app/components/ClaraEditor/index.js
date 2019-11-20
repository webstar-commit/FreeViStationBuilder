import React, { Component } from 'react';
import configActions from './actions';
import getCommand from './commands';
import Dialog from 'material-ui/Dialog';
import FlatButton from 'material-ui/FlatButton';
import cookie from 'react-cookie';
const changeEvent = [
  'fullscreenchange',
  'webkitfullscreenchange',
  'mozfullscreenchange',
  'msfullscreenchange',
];

export default class ClaraEditor extends Component {
  constructor(props) {
    super(props);
    this.state = {
      clara: null,
      viewCamera: null,
      orbitCamera: null,
      videoStream: null,
      saved: false,
    };
  }

  componentDidMount() {
    const self = this;
    const clara = claraplayer(this.refs.claraplayer);
    this.setState({ clara });
    clara.sceneIO.fetchAndUse(this.props.sceneId).then(() => {
      console.log('scene loaded');
      var objectsId = clara.scene.find({ type: 'Objects' });
      const viewCamera = clara.scene.find({
        type: 'Camera',
        name: 'viewCamera',
      });
      var orbitCam = clara.player.getCamera();
      if (this.props.sceneId === 'aa1cd0ba-8c73-4484-aa87-19c975b6f72d') {
        orbitCam = clara.scene.find({ type: 'Camera', name: 'OverCamera' });
        clara.player.useCamera(orbitCam);
      }
      this.setState({
        viewCamera: viewCamera,
        orbitCamera: orbitCam,
      });
      clara.selection.setHighlighting(true);

      const camId = clara.player.getCamera();
      const cam = clara.scene.get({ id: camId, evalPlug: 'Camera' });
      const camType = cam ? cam.projection : 'perspective';

      console.log(cam);
    });
    ['orbit', 'pan', 'zoom', 'home'].forEach(function(tool) {
      clara.player.hideTool(tool);
    });

    clara.commands.setCommandOptions('vrMode', { planeEnabled: false });
    clara.player.removeTool('select');
    clara.player.removeTool('nodeMove');
    clara.player.removeTool('nodeRotate');

    clara.player.addTool(
      {
        mousedown: ev => {
          const { THREE } = clara.deps;
          const widgetHits = clara._store.getTranslator().raycastSelect(
            {
              x: (2 * ev.clientX) / ev.rect.width - 1,
              y: (-2 * ev.clientY) / ev.rect.height + 1,
            },
            'Widgets'
          );
          if (widgetHits.length) return;

          const hits = clara.player.filterNodesFromPosition(ev);
          var item = null;
          if (hits.length > 0) {
            item = hits[0];
            if (item === 'translateSymbol' || item === 'rotateSymbol') {
              item = this.props.selectedItem;
            } else {
              item = hits[0];
              while (
                (clara.scene.get({ id: item, property: 'type' }) !== 'Null' ||
                  clara.scene.get({ id: item, property: 'name' }) !==
                    'Import Null') &&
                clara.scene.get({ id: item, property: 'type' }) !== 'Scene'
              ) {
                item = clara.scene.find({ id: item, parent: true });
              }
              item =
                clara.scene.get({ id: item, property: 'type' }) !== 'Scene'
                  ? item
                  : null;
            }
          }
          if (item === null) {
            this.props.hidePopupButton();
            this.props.openCloseMenu(false);
            if (this.props.selectedItem !== null) {
              this.props.selectItem(item);
            }
            clara.selection.deselectAll();
          } else {
            if (item !== this.props.selectedItem) {
              this.props.selectItem(item);
              // var pos = this.state.clara._store.getTranslator().toScreenPosition(this.props.selectedItem);
              // this.props.changePopupButtonPosition(pos.y-50, pos.x-100);
              this.props.showPopupButton();
            }
            clara.selection.selectNode(item);
          }
        },
      },
      'SelectItem'
    );
    clara.commands.addCommand(
      getCommand(this, clara, 'rotateItem'),
      'rotateItem'
    );
    clara.commands.addCommand(
      getCommand(this, clara, 'translateItem'),
      'translateItem'
    );
  }

  componentDidUpdate() {
    this.state.clara.player.resize();
    if (this.props.manipulator === 'orbit') {
      this.state.clara.selection.deselectAll();
    }
    this.state.clara.commands.runCommand(this.props.manipulator);
  }

  componentWillReceiveProps(nextProps) {
    const { clara } = this.state;
    const { renderingMode } = nextProps;
    if (renderingMode !== this.props.renderingMode) {
      if (this.props.renderingMode === 'VR') {
        this.switchVRMode(false);
      } else if (this.props.renderingMode === 'AR') {
        this.switchARMode(false);
      } else if (this.props.renderingMode === '3D') {
        this.switch3DMode(false);
      } else {
      }

      if (renderingMode === 'VR') {
        this.switchVRMode(true);
      } else if (renderingMode === 'AR') {
        this.switchARMode(true);
      } else if (renderingMode === '3D') {
        this.switch3DMode(true);
      } else {
      }
    }
  }

  switchVRMode(bool) {
    const { clara } = this.state;
    clara.commands.runCommand('vrMode');
  }

  switch3DMode(bool) {
    var self = this;
    var sceneId = this.props.sceneId;
    var display3d = function(clara) {
      if (bool) {
        clara.player.setFullscreenBGColor('#FFF');
        try {
          clara.player.requestLenticularMode({ trackDevice: true });
        } catch (err) {
          console.error('Aborting 3D Display: ' + err);
          this.props.switchRenderingMode('normal');
        }
        //clara.player.requestFullscreen();
        changeEvent.forEach(fn => {
          console.log(fn);
          document.addEventListener(fn, self.fullScreenChange.bind(self));
        }, self);
        if (screen.orientation && screen.orientation.lock) {
          console.log(screen.orientation);
          //screen.orientation.lock('landscape-primary');
        }
      } else {
        clara.player.exitFullscreen();
        clara.player.requestNormalMode();
        if (screen.orientation && screen.orientation.unlock) {
          // screen.orientation.unlock();
        }
      }

      try {
        if (self.props.threeDCapable) {
          window.parent.window.postMessage(
            { func: 'set3DModeParallel', params: [bool ? 1 : 0] },
            '*'
          );
        }
        if (self.props.S3DCapable) {
          if (bool) {
            window.parent.window.postMessage(
              { func: 'setS3DModeVertical' },
              '*'
            );
          } else {
            window.parent.window.postMessage({ func: 'setS3DModeOff' }, '*');
          }
        }
        clara.player.resize();
      } catch (err) {
        alert('ERROR:' + err);
      }
      try {
        if (self.props.S3DCapable) {
          if (bool) {
            window.parent.window.postMessage(
              JSON.parse(
                JSON.stringify({ func: 'setS3DModeHorizontal', params: [] })
              ),
              '*'
            );
          } else {
            window.parent.window.postMessage(
              JSON.parse(JSON.stringify({ func: 'setS3DModeOff', params: [] })),
              '*'
            );
          }
        }
        clara.player.resize();
      } catch (err) {
        alert('ERROR:' + err);
      }
    };
    const { clara } = this.state;
    var newCamId = bool
      ? clara.scene.find({ type: 'Camera', name: 'viewCamera' })
      : this.state.orbitCamera;

    if (newCamId) clara.player.useCamera(newCamId);
    display3d(clara);
    /*    else {
      var ObjectsId = clara.scene.find({ from: { id: sceneId }, name: 'Objects' });
      clara.sceneGraph.addNode({
        'name':'viewCamera',
        type: 'Camera',
        parent: ObjectsId,
        plugs: {
          Transform: [['Transform', {translation: {x: 0, y: 1.6, z: 0}}]],
        }
      }).then(function(nodeId){
        newCamId = nodeId;
        clara.player.useCamera(nodeId);
        display3d(clara);
      });
    }*/
    /*if(bool) {
      clara.player.setFullscreenBGColor('#FFF');
      try {
        clara.player.requestLenticularMode({trackDevice: true});
      } catch (err){
        console.error("Aborting 3D Display: "+err);
        this.props.switchRenderingMode('normal');
      }
      //clara.player.requestFullscreen();
      changeEvent.forEach((fn) => {
        console.log(fn);
        document.addEventListener(fn, this.fullScreenChange.bind(this));
      }, this);
      if (screen.orientation && screen.orientation.lock) {
        console.log(screen.orientation);
        screen.orientation.lock('landscape-primary');
      }
    }
    else {
      clara.player.exitFullscreen();
      clara.player.requestNormalMode();
      if (screen.orientation && screen.orientation.unlock) {
        screen.orientation.unlock();
      }
    }

    try {
      if(this.props.threeDCapable) {
        window.parent.window.postMessage(
         {'func':'set3DModeParallel','params':[bool?1:0]},
         '*');
      }
      if(this.props.S3DCapable) {
        if(bool) {
          window.parent.window.postMessage( {'func':'setS3DModeVertical'},'*');
        }
        else {
          window.parent.window.postMessage( {'func':'setS3DModeOff'},'*');
        }
      }
      clara.player.resize();

    } catch (err) {
       alert("ERROR:" + err);
    }*/
  }

  switchARMode(bool) {
    const { clara } = this.state;
    const self = this;
    const newCamId = bool ? this.state.viewCamera : this.state.orbitCamera;
    clara.player.useCamera(newCamId);
    var trans = clara.scene.find('AR Camera', 'Transform', 'translation');
    if (bool) {
      navigator.getUserMedia =
        navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia ||
        navigator.msGetUserMedia;
      MediaStreamTrack.getSources(function(sources) {
        var rear = sources.find(function(source) {
          return source.facing === 'environment';
        });
        var constaints = {
          audio: false,
          video: {
            optional: [{ sourceId: rear.id }],
          },
        };
        navigator.getUserMedia(
          constaints,
          function(mediaStream) {
            var vidSrc = window.URL.createObjectURL(mediaStream);
            var video = self.refs.ARVideo;
            video.src = vidSrc;
            video.onloadedmetadata = function(e) {
              console.log('videoloaded');
              video.play();
            };
            self.setState({ videoStream: mediaStream });
          },
          function(error) {
            self.setState({ videoStream: null });
            console.log('Somthing went wrong', error);
            self.props.switchRenderingMode('normal');
          }
        );
      });

      clara.player.setFullscreenBGColor('transparent');
      clara.player.enableDeviceTracking();
      //clara.player.disableMouseControls();
      const el = this.refs.fullscreenWrapper;
      [
        'requestFullscreen',
        'webkitRequestFullscreen',
        'mozRequestFullScreen',
        'msRequestFullscreen',
      ].forEach(function(fn, index) {
        if (el[fn]) {
          el[fn]();
          clara.player.resize();
          window.addEventListener(
            'orientationchange',
            this.handleOrient.bind(this)
          );
          return document.addEventListener(
            changeEvent[index],
            this.fullScreenChange.bind(this)
          );
        }
      }, this);
    } else {
      self.refs.ARVideo.pause();
      self.refs.ARVideo.src = null;
      if (self.state.videoStream) self.state.videoStream.getTracks()[0].stop();
      self.setState({ videoStream: null });
      clara.player.disableDeviceTracking();
      //clara.player.enableMouseControls();
      [
        'exitFullscreen',
        'webkitExitFullscreen',
        'mozCancelFullScreen',
        'msExitFullscreen',
      ].forEach(function(fn, index) {
        if (document[fn]) {
          window.removeEventListener(
            'orientationchange',
            this.handleOrient.bind(this)
          );
          return document[fn]();
        }
      }, this);
      /*if (screen.orientation && screen.orientation.unlock) {
        screen.orientation.unlock();
      }*/
    }
  }

  fullScreenChange(ev) {
    console.log('switch', ev);
    const elementCheck = {
      fullscreenChange: 'fullscreenElement',
      webkitfullscreenchange: 'webkitFullscreenElement',
      mozfullscreenchange: 'mozFullScreenElement',
      msfullscreenChange: 'msFullscreenElement',
    };

    if (this.props.renderingMode === 'AR')
      this.props.switchRenderingMode(
        !!document[elementCheck[ev.type]] ? 'AR' : 'normal'
      );
    else if (this.props.renderingMode === 'VR')
      this.props.switchRenderingMode(
        !!document[elementCheck[ev.type]] ? 'VR' : 'normal'
      );
    else if (this.props.renderingMode === '3D')
      this.props.switchRenderingMode(
        !!document[elementCheck[ev.type]] ? '3D' : 'normal'
      );

    if (!document[elementCheck[ev.type]])
      document.removeEventListener(ev.type, this.fullScreenChange.bind(this));
  }

  handleOrient(ev) {
    console.log(ev);
    this.state.clara.player.resize();
  }

  importScene(sceneId) {
    const self = this;
    var api = this.state.clara;
    const { selectItem } = this.props;
    var numImports = 0;
    api.sceneIO.fetch(sceneId).then(function() {
      var newObjectsId = api.scene.find({
        from: { id: sceneId },
        name: 'Objects',
      });
      var nodes = api.scene.filter({
        from: { id: newObjectsId },
        type: ['PolyMesh', 'BinMesh', 'Null'],
      });
      var materials = api.scene.filter({
        from: { id: sceneId },
        type: ['Material', 'Image'],
      });
      var config = api._store.getIn([
        'sceneGraph',
        sceneId,
        'plugs',
        'Player',
        0,
        'configurator',
      ]);
      var objectsId = api.scene.find({ type: 'Objects' });
      const configJSON = JSON.parse(config || 'null');
      api.scene.clone(materials).then(function(matMap) {
        api.sceneGraph
          .addNode({
            name: 'Import Null',
            parent: objectsId,
            type: 'Null',
            plugs: {
              Transform: [['Transform', { translation: { x: 0, y: 0, z: 0 } }]],
            },
          })
          .then(function(nullNodeId) {
            api.sceneGraph
              .addNode({
                name: 'Rotate Root',
                parent: nullNodeId,
                type: 'Null',
                plugs: {
                  Transform: [
                    ['Transform', { translation: { x: 0, y: 0, z: 0 } }],
                  ],
                },
              })
              .then(function(rotateNodeId) {
                api.sceneGraph
                  .clone(nodes, { [newObjectsId]: rotateNodeId })
                  .then(function(nodeMap) {
                    for (var oldId in nodeMap) {
                      if (nodeMap.hasOwnProperty(oldId)) {
                        var newId = nodeMap[oldId];
                        var oldMatId = api.scene.get({
                          id: oldId,
                          plug: 'Material',
                          property: 'reference',
                        });
                        if (oldMatId !== undefined) {
                          var newMatId = matMap[oldMatId];
                          api.scene.set(
                            {
                              id: newId,
                              plug: 'Material',
                              property: 'reference',
                            },
                            newMatId
                          );
                        }
                      }
                    }
                    self.props.setMap(sceneId, nullNodeId, configJSON);
                  });
              });
          });
      });
    });
  }

  copyNode(id) {
    const self = this;
    var api = this.state.clara;
    var parentId = api.scene.find({ type: 'Objects' });
    var myModelId = id;

    var nodes = api.scene.filter({
      from: { id: id },
      type: ['PolyMesh', 'BinMesh', 'Null'],
      includeParent: false,
    });
    api.sceneGraph
      .addNode({
        name: 'Import Null',
        parent: parentId,
        type: 'Null',
        plugs: {
          Transform: [['Transform', { translation: { x: 0, y: 0, z: 0 } }]],
        },
      })
      .then(function(nullNodeId) {
        api.sceneGraph
          .clone(nodes, { [id]: nullNodeId })
          .then(function(nodeMap) {
            nodes.forEach(node =>
              console.log(
                'new nodes',
                self.state.clara.scene.get({ id: node, property: 'name' })
              )
            );
            self.props.cloneMap(id, nullNodeId);
          });
      });
  }

  deleteNode(id) {
    var api = this.state.clara;
    api.sceneGraph.deleteNode(id);
  }

  snapshot() {
    //TODO: call snapshot function of claraplayer
    console.log('The function is null');
  }
  change(option, nodeId, sceneId) {
    let waitFor = null;
    const { clara } = this.state;
    if (option.actions && option.actions.length > 0) {
      option.actions.forEach(act => {
        if (act.delay) {
          waitFor = waitFor
            ? waitFor.then(delayedPromise(act.delay))
            : delayedPromise(act.delay);
        }
        function doit() {
          return configActions[act.action](
            clara.scene,
            act.query,
            act.value,
            nodeId,
            sceneId
          );
        }
        var result = waitFor ? waitFor.then(doit) : doit();

        waitFor = act.wait ? result : null;
      });
    }
  }
  /*  handleClose = () => {
    this.setState({saved: false});
    window.location.reload();
  };*/
  render() {
    const { renderingMode, playerStyle } = this.props;
    return (
      <div
        ref="fullscreenWrapper"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          minWidth: '1px',
          minHeight: '1px',
          overflow: 'hidden',
        }}
      >
        <video
          ref="ARVideo"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            minHeight: '100%',
            minWidth: '100%',
            visibility: renderingMode === 'AR' ? 'visible' : 'hidden',
          }}
        />
        <div ref="claraplayer" style={playerStyle} />
        {/*        <div>
          <Dialog
            title="Saved"
            actions={[<FlatButton
              label="OK"
              primary={true}
              onTouchTap={this.handleClose}
            />]}
            modal={false}
            open={this.state.saved}
            onRequestClose={this.handleClose}
          >
            The change you made on this station is saved.
          </Dialog>
      </div>*/}
      </div>
    );
  }

  saveChange(cb) {
    var userCookie = cookie.load('user');
    var api = this.state.clara;
    var self = this;
    const sceneId = this.props.sceneId;
    const transit = api.sceneIO.writeScene();
    fetch('/stations/save?sceneId=' + sceneId, {
      method: 'POST',
      mode: 'cors',
      headers: {
        Authorization: 'Basic',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'content=' + JSON.stringify(transit) + '&save=true',
    }).then(function(response) {
      response.json().then(function(result) {
        cb();
      });
    });
  }
}
ClaraEditor.propTypes = {
  width: React.PropTypes.number,
  height: React.PropTypes.number,
};
