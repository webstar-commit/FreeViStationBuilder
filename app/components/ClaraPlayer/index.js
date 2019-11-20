import React, { Component } from 'react';
import IconButton from 'material-ui/IconButton';
import IconImage from './3d-icon.png';

const changeEvent = [
  'fullscreenchange',
  'webkitfullscreenchange',
  'mozfullscreenchange',
  'msfullscreenchange',
];
export default class ClaraPlayer extends Component {
  constructor(props) {
    super(props);
    this.state = {
      clara: null,
      S3DCapable: /A6100/.test(navigator.userAgent),
      renderingMode: 'normal',
    };
    this.switchrenderMode = this.switchrenderMode.bind(this);
  }
  // componentWillMount() {
  //   const script = document.createElement("script");

  //   script.src = "/claraplayer-2.2.27.js";
  //   console.log(">>>>>", script);
  //   script.async = true;

  //   document.body.appendChild(script);
  // }
  componentDidMount() {
    const clara = claraplayer(this.refs.claraplayer);
    clara.sceneIO
      .fetchAndUse(this.props.sceneId, null, { waitForPublished: true })
      .then(() => {
        let viewCamId = clara.scene.find({
          type: 'Camera',
          name: 'viewCamera',
        });
        if (!viewCamId) {
          let cameraId = clara.scene.find({ type: 'Camera', name: 'Camera' });
          if (cameraId) clara.player.useCamera(cameraId);
          this.setState({
            clara: clara,
          });
        } else {
          clara.player.useCamera(viewCamId);
          this.setState({
            clara: clara,
          });
        }
      });
    ['home', 'pan', 'zoom', 'orbit'].forEach(function(tool) {
      clara.player.hideTool(tool);
    });
    if (this.props.sceneId === '6d85b8bb-b4a0-40cc-ac1f-c450ff029431') {
      clara.player.addTool({
        click: ev => {
          const selectedNode = clara.player.filterNodesFromPosition(ev);
          var tv = clara.scene.find({ name: 'LCD_Flate_02' });
          var tablet = clara.scene.find({ name: 'Tablet' });
          var shelf1 = clara.scene.find({ name: 'ShelveR001' });
          var shelf2 = clara.scene.find({ name: 'ShelveR' });
          var shelf3 = clara.scene.find({ name: 'FrontShelf' });
          var group1 = clara.scene.find({ name: 'Group007' });
          var wall = clara.scene.find({ name: 'Wall001' });
          for (var i = 0; i < selectedNode.length; i++) {
            var item = selectedNode[i];
            while (
              (clara.scene.get({ id: item, property: 'type' }) !== 'Null' ||
                clara.scene.get({ id: item, property: 'name' }) !==
                  'Import Null') &&
              clara.scene.get({ id: item, property: 'type' }) !== 'Scene'
            ) {
              if (item === tv) {
                window.location.assign(
                  'http://159.203.110.72/english1/lg-40-class-39-5-diag-led-1080p-hdtv-black.html'
                );
              } else if (item === tablet) {
                window.location.assign(
                  'http://159.203.110.72/english1/flightdeck-by-freevi.html'
                );
              } else if (
                item === shelf1 ||
                item === shelf2 ||
                item === shelf3 ||
                item === group1 ||
                item === wall
              ) {
                window.location.assign('http://159.203.110.72/english1');
              }
              item = clara.scene.find({ id: item, parent: true });
            }
          }
        },
      });
    }
    clara.commands.setCommandOptions('vrMode', { planeEnabled: false });
  }
  switchrenderMode() {
    if (this.state.renderingMode === 'normal') {
      this.switch3DMode(true);
    } else this.switch3DMode(false);
  }

  switch3DMode(bool) {
    var self = this;
    console.log(bool);
    var sceneId = this.props.sceneId;
    var display3d = function(clara) {
      if (bool) {
        clara.player.setFullscreenBGColor('#FFF');
        try {
          clara.player.requestLenticularMode({
            fullscreen: false,
            trackDevice: false,
          });
          self.setState({ renderingMode: '3D' });
        } catch (err) {
          console.error('Aborting 3D Display: ' + err);
          clara.player.requestNormalMode();
          self.setState({ renderingMode: 'normal' });
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
        self.setState({ renderingMode: 'normal' });
        if (screen.orientation && screen.orientation.unlock) {
          // screen.orientation.unlock();
        }
      }

      try {
        //github.com/callemall/material-ui/issues/125
        https: if (self.state.S3DCapable) {
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
  }
  fullScreenChange(ev) {
    console.log('switch', ev);
    const elementCheck = {
      fullscreenChange: 'fullscreenElement',
      webkitfullscreenchange: 'webkitFullscreenElement',
      mozfullscreenchange: 'mozFullScreenElement',
      msfullscreenChange: 'msFullscreenElement',
    };

    if (!document[elementCheck[ev.type]])
      document.removeEventListener(ev.type, this.fullScreenChange.bind(this));
  }

  componentDidUpdate() {
    if (this.state.clara) {
      this.state.clara.player.resize();
    }
  }

  switchVRMode(bool) {
    // const { clara } = this.state;
    this.state.clara.commands.runCommand('vrMode');
  }
  render() {
    const { playerStyle } = this.props;
    const playerSize = {
      position: 'relative',
      height: '100%',
      width: '100%',
      minWidth: '1px',
      minHeight: '1px',
      backgroundColor: 'transparent',
    };
    return (
      <div style={playerStyle}>
        <div ref="claraplayer" style={playerSize} />
        {this.state.S3DCapable && (
          <div
            style={{
              position: 'absolute',
              zIndex: 2147483647,
              bottom: '12px',
              right: '10px',
            }}
          >
            <IconButton
              iconStyle={{ color: 'white' }}
              onTouchTap={this.switchrenderMode}
            >
              <img src={IconImage} width="28px" height="28px" />
            </IconButton>
          </div>
        )}
      </div>
    );
  }
}

ClaraPlayer.propTypes = {};
