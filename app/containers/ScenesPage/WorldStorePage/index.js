import React, { Component } from 'react';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';
import ClaraPlayer from 'components/ClaraPlayer';
import UIAppBar from 'components/UIAppBar';
import Paper from 'material-ui/Paper';
import IconButton from 'material-ui/IconButton';
import NavigationBack from 'material-ui/svg-icons/navigation/arrow-back';
import List from 'material-ui/List';
import styles from './styles.css';
import Liked from 'material-ui/svg-icons/action/thumb-up';
import Comment from 'material-ui/svg-icons/communication/comment';
import cookie from 'react-cookie';
import Dialog from 'material-ui/Dialog';
import FlatButton from 'material-ui/FlatButton';

function navigationBackButton(func) {
  return (
    <div style={{ paddingLeft: '10px' }}>
      <IconButton iconStyle={{ color: 'white' }} onClick={func}>
        <NavigationBack />
      </IconButton>
    </div>
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
      balance: 0,
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

  open2DShop = () => {
    window.location.assign('http://159.203.110.72/english1/');
  };
  openBalancePage = () => {
    this.openRoute('/home/balance');
  };

  handleOpen = () => {
    this.setState({ commentsOpen: true });
  };
  handleClose = () => {
    this.setState({ commentsOpen: false });
  };

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
  showBalance(balance) {
    if (balance === 0) return '0';
    return balance > 1000000
      ? (balance / 1000000).toFixed(1) + 'M'
      : balance > 1000
        ? (balance / 1000).toFixed(1) + 'K'
        : balance.toFixed(0);
  }

  componentWillMount() {
    var self = this;
    const userCookie = cookie.load('user');
    if (typeof userCookie === 'undefined') return;
    const sceneId = '6d85b8bb-b4a0-40cc-ac1f-c450ff029431';
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
    const sceneId = '6d85b8bb-b4a0-40cc-ac1f-c450ff029431';
    const actions = [
      <FlatButton label="Back" primary={true} onTouchTap={this.handleClose} />,
    ];
    return (
      <div className={styles.container}>
        <div className={styles.appbar}>
          <UIAppBar
            titleText="Freevi Shop"
            leftIcon={navigationBackButton(this.openNavBack)}
            rightIcon={
              <div style={{ color: 'white', marginTop: 12 }}>
                <span style={{ fontSize: 15, color: 'white' }}>
                  {' '}
                  vit: {this.showBalance(this.state.balance)}{' '}
                </span>
              </div>
            }
          />
        </div>
        <div className={styles.mainBlock} ref="playerContainer">
          <ClaraPlayer
            playerStyle={playerStyle}
            ref="player"
            sceneId={sceneId}
          />
        </div>
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
