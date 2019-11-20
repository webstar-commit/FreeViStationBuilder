import React, { Component } from 'react';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';
import ClaraPlayer from 'components/ClaraPlayer';
import UIAppBar from 'components/UIAppBar';
import Paper from 'material-ui/Paper';
import IconButton from 'material-ui/IconButton';
import NavigationBack from 'material-ui/svg-icons/maps/my-location';
import styles from './styles.css';
import Liked from 'material-ui/svg-icons/action/thumb-up';
import Drawer from 'material-ui/Drawer';
import Comment from 'material-ui/svg-icons/communication/comment';
import Edit from 'material-ui/svg-icons/image/edit';
import cookie from 'react-cookie';
import FlatButton from 'material-ui/FlatButton';
import UI_VR_AR_Toggle from 'components/UI_VR_AR_Toggle';
import FloatingActionButton from 'material-ui/FloatingActionButton';
import CommentCard from 'components/CommentCard';
import worldicon from './images/worldview.png';

function navigationBackButton(func) {
  return (
    <IconButton onClick={func}>
      <img src={worldicon} width="28px" height="28px" />
    </IconButton>
  );
}
const paperStyle = {
  display: 'inline-block',
  float: 'center',
  textAlign: 'center',
  margin: '16px 32px 16px 0',
  width: '100%',
  zDepth: 1,
};
const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const crosswalk = /Crosswalk/.test(navigator.userAgent) && !window.MSStream;
export class ViewPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      sceneName: null,
      userName: null,
      liked: null,
      likeCount: null,
      commentCount: null,
      viewCount: null,
      vrCapable: !iOS,
      commentsOpen: false,
      renderingMode: 'normal',
      edit: false,
    };
    this.handleOpen = this.handleOpen.bind(this);
    this.addLike = this.addLike.bind(this);
  }

  openRoute = route => {
    this.props.changeRoute(route);
  };

  openNavBack = () => {
    var json = cookie.load('user');
    if (typeof json === 'undefined') {
      this.openRoute('/');
    } else {
      this.openRoute('/user/world/' + json.user.username);
    }
  };

  openEditorPage = () => {
    const { sceneId } = this.props.params;
    this.openRoute('/station/' + sceneId + '/builder');
  };
  switchRenderingMode = mode => {
    this.setState({ renderingMode: mode });
  };

  handleOpen = () => {
    this.setState({ commentsOpen: true });
  };
  handleClose = () => {
    this.setState({ commentsOpen: false });
  };
  showBalance(balance) {
    if (balance === 0) return '0';
    return balance > 1000000
      ? (balance / 1000000).toFixed(1) + 'M'
      : balance > 1000
        ? (balance / 1000).toFixed(1) + 'K'
        : balance.toFixed(0);
  }
  addLike = sceneId => {
    var self = this;
    var json = cookie.load('user');
    if (typeof json === 'undefined') return;
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
          var tmp = self.state.likeCount;
          if (self.state.liked) {
            if (tmp !== 0) self.setState({ likeCount: tmp - 1, liked: false });
          } else {
            self.setState({ liked: true, likeCount: tmp + 1 });
          }
        }
      });
    });
  };

  getCommentCount(comment) {
    this.setState({ commentCount: comment });
  }

  componentWillMount() {
    var self = this;

    const userCookie = cookie.load('user');
    if (typeof userCookie === 'undefined') return;
    const { sceneId } = this.props.params;
    // const {sceneId} = this.props.params;
    function getSceneInfo(sceneId, path, cb) {
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
    }
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
        response.json().then(function(results) {
          var balance = 0;
          results.forEach(function(result) {
            if (result.status === 'success') {
              balance += result.amount;
            }
          });
          self.setState({ balance: balance });
          //window.location.reload();
        });
      });
    };
    putData();

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
    getSceneInfo(sceneId, '/stations/info', function(json) {
      var sceneInfo = JSON.parse(json.body);
      var edit = false;
      if (userCookie.user.username === sceneInfo.owner) edit = true;

      if (sceneId === '287d879c-6162-4717-8fe5-8f8de87ab1b1') {
        edit = true;
      }
      self.setState({
        sceneName: sceneInfo.name,
        liked: sceneInfo.liked,
        edit: edit,
        likeCount: sceneInfo.likeCount,
        viewCount: sceneInfo.viewCount,
      });
    });
  }
  render() {
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
      userCookie.user.username === 'guest'
    ) {
      this.openRoute('/');
      return null;
    }
    const { sceneId } = this.props.params;
    // const {sceneId} = this.props.params;
    const actions = [
      <FlatButton label="Back" primary={true} onTouchTap={this.handleClose} />,
    ];
    return (
      <div className={styles.container}>
        <div className={styles.appbar}>
          <UIAppBar
            titleText={this.state.sceneName}
            leftIcon={navigationBackButton(this.openNavBack)}
            rightIcon={
              this.state.viewCount ? (
                <div style={{ color: 'white', marginRight: 10 }}>
                  <span style={{ color: 'white' }}>
                    {' '}
                    vit: {this.showBalance(this.state.balance)}{' '}
                  </span>
                  <FlatButton
                    style={{ color: 'white' }}
                    label={
                      this.state.commentCount === 0
                        ? '0'
                        : this.state.commentCount
                    }
                    icon={<Comment />}
                    onTouchTap={this.handleOpen}
                  />
                </div>
              ) : null
            }
          />
        </div>
        <div className={styles.mainBlock} ref="playerContainer">
          <ClaraPlayer
            playerStyle={playerStyle}
            renderingMode={this.state.renderingMode}
            ref="player"
            sceneId={sceneId}
          />
        </div>
        {this.state.edit && (
          <div
            className={styles.floatingButton}
            onTouchTap={ev => {
              this.openEditorPage();
            }}
          >
            <FloatingActionButton>
              <Edit />
            </FloatingActionButton>
          </div>
        )}
        <div className={styles.UIButton}>
          <UI_VR_AR_Toggle
            switchRenderingMode={this.switchRenderingMode.bind(this)}
            renderingMode={this.state.renderingMode}
            vrCapable={this.state.vrCapable}
            threeDCapable={false}
            arCapable={false}
          />
        </div>
        <Drawer
          docked={false}
          width={600}
          open={this.state.commentsOpen}
          openSecondary={true}
          onRequestChange={open => this.setState({ commentsOpen: open })}
        >
          <CommentCard
            sceneId={sceneId}
            getCommentCount={this.getCommentCount.bind(this)}
          />
        </Drawer>
      </div>
    );
  }
}

ViewPage.propTypes = {
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
)(ViewPage);
