import React, { Component } from 'react';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';
import ClaraEditor from 'components/ClaraEditor';
import CircularProgress from 'material-ui/CircularProgress';
import Drawer from 'material-ui/Drawer';
import CommentCard from 'components/CommentCard';
import UIPlusButton from 'components/UIPlusButton';
import UIAppBar from 'components/UIAppBar';
import Dialog from 'material-ui/Dialog';
import Liked from 'material-ui/svg-icons/action/thumb-up';
import PopupButton from 'components/PopupButton';
import UI_VR_AR_Toggle from 'components/UI_VR_AR_Toggle';
import NewItemMenuContainer from 'containers/NewItemMenuContainer';
import Comment from 'material-ui/svg-icons/communication/comment';
import cookie from 'react-cookie';
import IconButton from 'material-ui/IconButton';

import styles from './styles.css';
import NavigationBack from 'material-ui/svg-icons/navigation/arrow-back';
import WorldView from '../WorldStationView/images/location.png';

const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
export class EditorPage extends Component {
  constructor(props) {
    super(props);
    const crosswalk = /Crosswalk/.test(navigator.userAgent) && !window.MSStream;

    this.state = {
      renderingMode: 'normal',
      selectedItem: null,
      previousSelectedItem: null,
      activeManipulator: 'orbit',
      prevActiveManipulator: 'orbit',
      nodeConfMap: {},
      uiPlusOpen: false,
      popupButton: -1,
      popupButtonPos: { x: 0, y: 0 },
      vrCapable: !iOS,
      threeDCapable: false,
      S3DCapable: /A6100/.test(navigator.userAgent),
      arCapable: false,
      dialogOpen: false,
      balance: null,
      commentsOpen: false,
      saveOpen: false,
    };
    this.handleOpen = this.handleOpen.bind(this);
  }

  componentWillMount() {
    const self = this;
    const { sceneId } = this.props.params || this.props.sceneId;
    //const sceneId  = '0664f630-44e6-46ca-a016-88abb643fd5d';
    var userCookie = cookie.load('user');
    var putData = function() {
      fetch('/users/transactions', {
        method: 'POST',
        mode: 'cors',
        headers: {
          Authorization: 'Basic',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'method=GET&username=' + userCookie.user.username,
      }).then(function(response) {
        response.json().then(function(result) {
          self.setState({ balance: result.balance });
          //window.location.reload();
        });
      });
    };
    var getSceneInfo = function(sceneId, path, cb) {
      fetch(path, {
        method: 'POST',
        mode: 'cors',
        headers: {
          Authorization: 'Basic',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'method=GET&sceneId=' + sceneId,
      }).then(function(response) {
        response.json().then(function(json) {
          cb(json);
        });
      });
    };
    putData();
    getSceneInfo(sceneId, '/stations/info', function(json) {
      var info = JSON.parse(json.body);
      self.setState({ sceneName: info.name, liked: info.liked });
    });
    window.addEventListener('resize', ev => this.handleResize(ev));
    if (typeof window.navigator.getVRDisplays === 'function') {
      window.navigator.getVRDisplays().then(function(displays) {
        if (displays.length > 0) {
          if (!displays[0].capabilities.canPresent) {
            self.setState({ vrCapable: false });
          }
        }
      });
    } else {
      self.setState({ vrCapable: false });
    }
    if (!iOS) {
      if (MediaStreamTrack && MediaStreamTrack.getSources) {
        console.log('Checking camera........');
        MediaStreamTrack.getSources(function(sources) {
          var rear = sources.find(function(source) {
            return source.facing === 'environment';
          });
          if (rear) {
            console.log(' Found rear camera');
            self.setState({ arCapable: true });
          } else {
            console.log(' No rear camera found');
          }
        });
      }
    }

    window.addEventListener('Support3DMode', ev => {
      self.setState({ threeDCapable: ev.detail });
    });
    try {
      //this window is the iframe, window.parent.window is the native app.
      window.parent.window.postMessage(
        JSON.parse(JSON.stringify({ func: 'is3DModeSupported', params: [] })),
        '*'
      );
    } catch (err) {
      console.log(err);
    }
    /* window.addEventListener('SupportS3DMode', (ev)=>{
      console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>S3D");
      self.setState({S3DCapable: ev.detail});
    });
    try{
      //this window is the iframe, window.parent.window is the native app.
      console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>Detecting S3D");
      window.parent.window.postMessage(
        JSON.parse(JSON.stringify({'func':'isS3DModeSupported','params':[]})), '*');
    } catch (err){
      console.log(err);
    }*/
  }

  openRoute = route => {
    window.location.assign(route);
    //this.props.changeRoute(route);
  };
  handleResize(ev) {}

  openNavBack = () => {
    this.setState({ saveOpen: true });
    var self = this;
    var userCookie = cookie.load('user');
    this.saveChange(function(cb) {
      self.setState({ saveOpen: false });
      self.openRoute('/user/' + userCookie.user.username);
    });
  };

  openCloseMenu(bool) {
    this.setState({ uiPlusOpen: bool });
  }

  importItem(id, access) {
    this.hidePopupButton();
    this.switchTools('orbit');
    this.refs.player.importScene(id);
    //this.setState({previousSelectedItem: this.state.selectedItem, selectedItem:null});
  }

  switchRenderingMode(mode) {
    this.setState({ renderingMode: mode });
  }

  setMap(sceneId, nodeId, config) {
    const mapping = { scene: sceneId, config: config };
    let obj = { ...this.state.nodeConfMap };
    obj[nodeId] = mapping;
    this.setState({ nodeConfMap: obj, selectedItem: null });
  }

  cloneMap(oldNode, newNode) {
    let obj = { ...this.state.nodeConfMap };
    const newConfig = JSON.parse(JSON.stringify(obj[oldNode].config));
    obj[newNode] = { scene: obj[oldNode].scene, config: newConfig };
    this.setState({ nodeConfMap: obj });
  }

  deleteObject() {
    this.deleteItem(this.state.selectedItem);
  }

  deleteItem(id) {
    this.refs.player.deleteNode(id);
    let obj = { ...this.state.nodeConfMap };
    delete obj[this.state.selectedItem];
    this.setState({
      previousSeletedItem: null,
      selectedItem: null,
      nodeConfMap: obj,
      popupButton: -1,
      activeManipulator: 'orbit',
      prevActiveManipulator: 'orbit',
    });
  }

  copyObject() {
    this.refs.player.copyNode(this.state.selectedItem);
  }

  selectItem(id) {
    if (id) {
      if (this.state.selectedItem !== id) {
        this.setState({ activeManipulator: 'translateItem' });
      }

      if (this.state.selectedItem === null) {
        this.setState({ previousSelectedItem: id, selectedItem: id });
      } else {
        this.setState({
          previousSelectedItem: this.state.selectedItem,
          selectedItem: id,
        });
      }
    } else if (this.state.selectedItem) {
      this.setState({
        previousSelectedItem: this.state.selectedItem,
        selectedItem: null,
        activeManipulator: 'orbit',
      });
    } else {
      this.setState({ activeManipulator: 'orbit' });
    }
  }

  switchTools(tool) {
    if (!this.state.selectedItem) this.setState({ activeManipulator: 'orbit' });
    else {
      if (tool === 'orbit') this.selectItem(null);
      this.setState({ activeManipulator: tool, prevActiveManipulator: tool });
    }
  }
  buyItem(value) {
    this.setState(prevState => {
      return { balance: prevState.balance - value };
    });
  }

  change(option, variants) {
    const { selectedItem, nodeConfMap } = this.state;
    this.refs.player.change(
      option,
      selectedItem,
      nodeConfMap[selectedItem].scene
    );
    const newConfig = {
      ...nodeConfMap[selectedItem].config,
      variants: variants,
    };
    let newNodeMap = nodeConfMap;
    newNodeMap[selectedItem] = {
      ...nodeConfMap[selectedItem],
      config: newConfig,
    };
    this.setState({ nodeConfMap: newNodeMap });
  }

  snapshot() {
    //console.log(this.refs.player);
    //this.refs.player.snapshot();
  }
  saveChange(cb) {
    this.refs.player.saveChange(cb);
  }
  showPopupButton() {
    this.setState({ popupButton: 3 });
  }
  hidePopupButton() {
    this.setState({ popupButton: -10 });
  }
  changePopupButtonPosition(x, y) {
    this.setState({ popupButtonPos: { x: x, y: y } });
  }
  showBalance(balance) {
    if (typeof balance === 'undefined' || balance === 0) return '0';
    return balance >= 1000000
      ? (balance / 1000000).toFixed(1) + 'M'
      : balance >= 1000
        ? (balance / 1000).toFixed(1) + 'K'
        : balance.toFixed(0);
  }
  handleOpen() {
    this.setState(prevState => {
      return { commentsOpen: !prevState.commentsOpen };
    });
  }
  addLike = () => {
    var self = this;
    const { sceneId } = this.props.params || this.props.sceneId;
    var json = cookie.load('user');
    if (typeof json === 'undefined') return;
    if (json.user.username === 'guest') {
      this.props.changeRoute('/');
    }
    fetch('/stations/like', {
      method: 'POST',
      mode: 'cors',
      headers: {
        Authorization: 'Basic',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'sceneId=' + sceneId + '&like=' + this.state.liked,
    }).then(function(response) {
      response.json().then(function(result) {
        if (result.statusCode === 200) {
          self.setState(prevState => {
            return { liked: !prevState.liked };
          });
        }
      });
    });
  };

  render() {
    const {
      renderingMode,
      activeManipulator,
      selectedItem,
      previousSelectedItem,
      nodeConfMap,
      uiPlusOpen,
      popupButton,
      popupButtonPos,
      vrCapable,
      threeDCapable,
      S3DCapable,
      arCapable,
    } = this.state;
    const { sceneId } = this.props.params || this.props.sceneId;
    //const sceneId = '0664f630-44e6-46ca-a016-88abb643fd5d';
    const width = screen.width; //window.innerWidth > 0 ? window.innerWidth : screen.width;
    var drawerWidth = 0.4 * width;
    if (drawerWidth < 300) drawerWidth = 300;
    const playerStyle = {
      position: 'absolute',
      height: '100%',
      width: '100%',
      minWidth: '1px',
      minHeight: '1px',
      backgroundColor: 'transparent',
    };

    var userCookie = cookie.load('user');
    if (
      typeof userCookie === 'undefined' ||
      userCookie.user.userCookie === 'guest'
    ) {
      this.openRoute('/');
      return null;
    }

    var balance = this.state.balance ? this.state.balance : 0;
    var avatarName = userCookie.user.name
      ? userCookie.user.name
      : userCookie.user.username;
    return (
      <div className={styles.container}>
        <div className={styles.appbar}>
          <UIAppBar
            titleText={
              this.props.openNavBack ? (
                <span
                  style={{ cursor: 'pointer' }}
                  onClick={this.props.openNavBack}
                >
                  Save
                </span>
              ) : (
                'Editor'
              )
            }
            leftIcon={
              <div style={{ display: 'flex' }}>
                <IconButton
                  iconStyle={{ color: 'white' }}
                  onTouchTap={
                    this.props.openNavBack
                      ? this.props.openNavBack
                      : this.openNavBack
                  }
                >
                  {this.props.openNavBack ? (
                    <img src="https://s3-us-west-2.amazonaws.com/files.vimarket.io/save_white_24x24.png" />
                  ) : (
                    <NavigationBack />
                  )}
                </IconButton>
              </div>
            }
            rightIcon={
              <div
                style={{
                  display: 'flex',
                  marginRight: '12px',
                  fontFamily: 'Roboto, sans-serif',
                  fontSize: 15,
                }}
              >
                <PopupButton
                  open={uiPlusOpen}
                  openClose={this.openCloseMenu.bind(this)}
                  selectedItem={selectedItem}
                  activeManipulator={activeManipulator}
                  actions={{
                    switchTools: this.switchTools.bind(this),
                    copy: this.copyObject.bind(this),
                    delete: this.deleteObject.bind(this),
                    hidePopupButton: this.hidePopupButton.bind(this),
                  }}
                />
                <IconButton
                  onTouchTap={
                    this.props.openNavBack
                      ? this.props.openNavBack
                      : this.addLike
                  }
                  iconStyle={
                    this.state.liked ? { color: '#4080ff' } : { color: 'white' }
                  }
                >
                  {' '}
                  <Liked />{' '}
                </IconButton>
                <IconButton
                  onTouchTap={
                    this.props.openNavBack
                      ? this.props.openNavBack
                      : this.handleOpen
                  }
                  iconStyle={{ color: 'white' }}
                >
                  {' '}
                  <Comment />{' '}
                </IconButton>
              </div>
            }
          />
        </div>
        <div className={styles.mainBlock} ref="playerContainer">
          <div className={styles.header}>
            <div className={styles.title}>{this.state.sceneName} </div>
          </div>
          <ClaraEditor
            ref="player"
            renderingMode={renderingMode}
            threeDCapable={threeDCapable}
            S3DCapable={S3DCapable}
            switchRenderingMode={this.switchRenderingMode.bind(this)}
            switchTools={this.switchTools.bind(this)}
            sceneId={sceneId}
            manipulator={activeManipulator}
            showPopupButton={this.showPopupButton.bind(this)}
            hidePopupButton={this.hidePopupButton.bind(this)}
            changePopupButtonPosition={this.changePopupButtonPosition.bind(
              this
            )}
            selectItem={this.selectItem.bind(this)}
            previousSelectedItem={previousSelectedItem}
            selectedItem={selectedItem}
            setMap={this.setMap.bind(this)}
            cloneMap={this.cloneMap.bind(this)}
            openCloseMenu={this.openCloseMenu.bind(this)}
            playerStyle={playerStyle}
          />
        </div>
        <div className={styles.ViTokens}>
          <p style={{ zIndex: 10000, color: '#fff', marginBottom: '25px' }}>
            {' '}
            vit: {this.showBalance(balance)}{' '}
          </p>
        </div>
        <div className={styles.floatingButton}>
          <UIPlusButton
            menu={
              <NewItemMenuContainer
                public={!!this.props.openNavBack}
                addNewItem={this.importItem.bind(this)}
                buyItem={this.buyItem.bind(this)}
                sceneId={sceneId}
              />
            }
            open={uiPlusOpen}
            openClose={this.openCloseMenu.bind(this)}
          />
        </div>
        <div
          style={{
            position: 'absolute',
            top: popupButtonPos.y,
            left: popupButtonPos.x,
            zIndex: popupButton,
          }}
        >
          <PopupButton
            open={uiPlusOpen}
            openClose={this.openCloseMenu.bind(this)}
            selectedItem={selectedItem}
            activeManipulator={activeManipulator}
            actions={{
              switchTools: this.switchTools.bind(this),
              copy: this.copyObject.bind(this),
              delete: this.deleteObject.bind(this),
              hidePopupButton: this.hidePopupButton.bind(this),
            }}
          />
        </div>
        <Drawer
          docked={false}
          width={drawerWidth}
          open={this.state.commentsOpen}
          openSecondary={true}
          onRequestChange={open => this.setState({ commentsOpen: open })}
        >
          <CommentCard sceneId={sceneId} />
        </Drawer>
        <Dialog open={this.state.saveOpen}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              height: '100%',
            }}
          >
            <CircularProgress size={80} thickness={7} />
            <h3>Saving changes</h3>
          </div>
        </Dialog>
      </div>
    );
  }
}

EditorPage.propTypes = {
  changeRoute: React.PropTypes.func,
};

function mapDispatchToProps(dispatch) {
  return {
    changeRoute: url => dispatch(push(url)),
  };
}

export default connect(
  null,
  mapDispatchToProps
)(EditorPage);
