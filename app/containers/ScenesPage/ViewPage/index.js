import React, { Component } from 'react';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';
import ClaraPlayer from 'components/ClaraPlayer';
import UIAppBar from 'components/UIAppBar';
import Paper from 'material-ui/Paper';
import IconButton from 'material-ui/IconButton';
import List from 'material-ui/List';
import styles from './styles.css';
import Liked from 'material-ui/svg-icons/action/thumb-up';
import Drawer from 'material-ui/Drawer';
import MenuItem from 'material-ui/MenuItem';
import IconMenu from 'material-ui/IconMenu';
import UI_VR_AR_Toggle from 'components/UI_VR_AR_Toggle';
import MoreVertIcon from 'material-ui/svg-icons/navigation/more-vert';
import Comment from 'material-ui/svg-icons/communication/comment';
import Edit from 'material-ui/svg-icons/image/edit';
import NavigationBack from 'material-ui/svg-icons/navigation/arrow-back';
import cookie from 'react-cookie';
import ReactLetterAvatar from 'react-letter-avatar';
import FloatingActionButton from 'material-ui/FloatingActionButton';
import CommentCard from 'components/CommentCard';
import WorldView from '../WorldStationView/images/location.png';

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
      commentsOpen: false,
      edit: false,
      vrCapable: !iOS,
      S3DCaopable: false,
      renderingMode: 'normal',
      balance: null,
    };
    this.handleOpen = this.handleOpen.bind(this);
    this.addLike = this.addLike.bind(this);
  }

  openRoute = route => {
    //window.location.assign(route);
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
  openUserPage = () => {
    var owner = this.state.ownUser;
    var userCookie = cookie.load('user');
    if (userCookie.user.username === 'guest') {
      this.openRoute('/');
      return;
    }
    if (owner) this.openRoute('/user/' + owner);
    else return;
  };
  openEditorPage = () => {
    const { sceneId } = this.props.params;
    this.openRoute('/station/' + sceneId + '/builder');
  };
  openBalancePage = () => {
    this.openRoute('/home/balance');
  };

  handleOpen = () => {
    var userCookie = cookie.load('user');
    if (userCookie.user.username === 'guest') {
      this.props.changeRoute('/');
    }
    this.setState({ commentsOpen: true });
  };

  addLike = () => {
    var self = this;
    const { sceneId } = this.props.params;
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

  getCommentCount(comment) {
    this.setState({ commentCount: comment });
  }

  switchRenderingMode = mode => {
    this.setState({ renderingMode: mode });
  };

  showBalance(balance) {
    if (typeof balance === 'undefined' || balance === 0) return '0';
    return balance >= 1000000
      ? (balance / 1000000).toFixed(1) + 'M'
      : balance >= 1000
        ? (balance / 1000).toFixed(1) + 'K'
        : balance.toFixed(0);
  }

  componentWillMount() {
    var self = this;
    const userCookie = cookie.load('user');
    if (typeof userCookie === 'undefined') return;
    const { sceneId } = this.props.params;

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
    var getOwnerInfo = function(ownerName, cb) {
      fetch('/users/info', {
        method: 'POST',
        mode: 'cors',
        headers: {
          Authorization: 'Basic',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'method=GET&username=' + ownerName,
      }).then(function(response) {
        response.json().then(function(results) {
          cb(results);
        });
      });
    };
    var fetchTransactions = function(cb) {
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
          cb(balance);
        });
      });
    };
    /*    if(typeof window.navigator.getVRDisplays === 'function') {
      window.navigator.getVRDisplays().then(function(displays) {
        if (displays.length > 0) {
          if(!displays[0].capabilities.canPresent) {
            self.setState({ vrCapable:false });
          }
        }
      });
    }
    else {
      self.setState({ vrCapable:false });
    }*/
    getSceneInfo(sceneId, '/stations/info', function(json) {
      var sceneInfo = JSON.parse(json.body);
      var edit = false;
      if (sceneInfo.owner === 'FreeVi') {
        self.openRoute('/station/' + sceneId + '/builder');
        return;
      }
      var vrCapable = self.state.vrCapable;
      getOwnerInfo(sceneInfo.owner, function(json) {
        fetchTransactions(function(balance) {
          var owner = json.name ? json.name : json.username;
          var fbId = null;
          if (json.facebookUserId)
            fbId =
              'https://graph.facebook.com/' +
              json.facebookUserId +
              '/picture?type=normal';

          self.setState({
            balance: balance,
            sceneName: sceneInfo.name,
            liked: sceneInfo.liked,
            edit: edit,
            likeCount: sceneInfo.likeCount,
            viewCount: sceneInfo.viewCount,
            vrCapable: vrCapable,
            owner: owner,
            ownUser: sceneInfo.owner,
            fbId: fbId,
          });
          console.log(self.state);
        });
      });
    });
    window.addEventListener('SupportS3DMode', ev => {
      console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>S3D');
      self.setState({ S3DCaopable: ev.detail });
    });
    try {
      //this window is the iframe, window.parent.window is the native app.
      console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>Detecting S3D');
      window.parent.window.postMessage(
        JSON.parse(JSON.stringify({ func: 'isS3DModeSupported', params: [] })),
        '*'
      );
    } catch (err) {
      console.log(err);
    }
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
    const { sceneId } = this.props.params;
    var userCookie = cookie.load('user');
    if (
      typeof userCookie === 'undefined' ||
      userCookie.user.userCookie === 'guest'
    ) {
      this.openRoute('/');
      return null;
    }
    const width = window.innerWidth > 0 ? window.innerWidth : screen.width;
    var drawerWidth = 0.4 * width;
    if (drawerWidth < 300) drawerWidth = 300;
    const balance = this.state.balance ? this.state.balance : 0;
    if (typeof this.state.owner === 'undefined') return null;
    return (
      <div className={styles.container}>
        <div className={styles.appbar}>
          <UIAppBar
            titleText="Viewer"
            leftIcon={
              <div style={{ display: 'flex' }}>
                <IconButton
                  iconStyle={{ color: 'white' }}
                  onTouchTap={this.openNavBack}
                >
                  <NavigationBack />
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
                <IconButton
                  onTouchTap={this.addLike}
                  iconStyle={
                    this.state.liked ? { color: '#4080ff' } : { color: 'white' }
                  }
                >
                  {' '}
                  <Liked />{' '}
                </IconButton>
                <IconButton
                  onTouchTap={this.handleOpen}
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
            <div className={styles.title}>{this.state.sceneName}</div>
            <div onClick={this.openUserPage} className={styles.author}>
              <span>By</span>
              <div style={{ marginLeft: 10, display: 'flex' }}>
                {this.state.fbId ? (
                  <img
                    src={this.state.fbId}
                    style={{ borderRadius: '50%', cursor: 'pointer' }}
                    width="30px"
                    height="30px"
                  />
                ) : this.state.owner ? (
                  <ReactLetterAvatar
                    name={this.state.owner}
                    size={30}
                    radius={25}
                  />
                ) : null}
                <span
                  style={{ marginLeft: '5%', width: '300px', fontWeight: 20 }}
                >
                  {' '}
                  {this.state.owner}
                </span>
              </div>
            </div>
          </div>
          <ClaraPlayer
            playerStyle={playerStyle}
            ref="player"
            renderingMode={this.state.renderingMode}
            sceneId={sceneId}
          />
          <div className={styles.ViTokens}>
            <p style={{ marginBottom: '25px' }}>
              {' '}
              VIT: {this.showBalance(balance)}{' '}
            </p>
          </div>
        </div>
        {this.state.edit && (
          <div
            className={styles.floatingButton}
            onTouchTap={ev => {
              this.openEditorPage();
            }}
          >
            <FloatingActionButton mini={true}>
              <Edit />
            </FloatingActionButton>
          </div>
        )}
        <Drawer
          docked={false}
          width={drawerWidth}
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
