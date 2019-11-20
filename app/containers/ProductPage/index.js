import React, { Component } from 'react';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';
import cookie from 'react-cookie';
import UIAppBar from 'components/UIAppBar';
import ClaraPlayer from 'components/ClaraPlayer';
import NavigationBack from 'material-ui/svg-icons/navigation/arrow-back';
import styles from './styles.css';
import Liked from 'material-ui/svg-icons/action/thumb-up';
import Comment from 'material-ui/svg-icons/communication/comment';
import CommentCard from 'components/CommentCard';
import Drawer from 'material-ui/Drawer';
import { Tabs, Tab } from 'material-ui/Tabs';
import IconButton from 'material-ui/IconButton';
import RaisedButton from 'material-ui/RaisedButton';
import ReactLetterAvatar from 'react-letter-avatar';
import Lock from 'material-ui/svg-icons/action/lock-outline';
import FlatButton from 'material-ui/FlatButton';
import Dialog from 'material-ui/Dialog';
import MyDialog from 'components/MyDialog';

export class ProductPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      buyError: false,
      renderingMode: 'normal',
      commentsOpen: false,
    };
    this.PurchaseStation = this.PurchaseStation.bind(this);
    this.handleOpen = this.handleOpen.bind(this);
    this.addLike = this.addLike.bind(this);
  }

  openRoute = route => {
    const reload = /A6100/.test(navigator.userAgent);
    //this.props.changeRoute(route);
    if (reload) window.location.assign(route);
    else this.props.changeRoute(route);
  };

  openStore = () => {
    this.openRoute('/store');
  };

  componentWillMount() {
    var self = this;
    var userCookie = cookie.load('user');
    const { sceneId } = this.props.params;
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
          cb(results.balance);
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

    fetchTransactions(function(balance) {
      self.setState({ balance: balance });
    });
    getSceneInfo(sceneId, '/stations/info', function(json) {
      var sceneInfo = JSON.parse(json.body);
      var userCollection = userCookie.user.purchased;
      self.setState({
        sceneName: sceneInfo.name,
        owner: sceneInfo.owner,
        liked: sceneInfo.liked,
        price: 100,
        access: userCollection && userCollection.indexOf(sceneInfo._id) !== -1,
      });
    });
  }
  handleOpen = () => {
    this.setState({ commentsOpen: true });
  };

  addLike = () => {
    var self = this;
    const { sceneId } = this.props.params;
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
  showBalance(balance) {
    if (typeof balance === 'undefined' || balance === 0) return '0';
    return balance >= 1000000
      ? (balance / 1000000).toFixed(1) + 'M'
      : balance >= 1000
        ? (balance / 1000).toFixed(1) + 'K'
        : balance.toFixed(0);
  }

  PurchaseStation() {
    var self = this;
    var userCookie = cookie.load('user');
    const { sceneId } = this.props.params;
    var collection = userCookie.user.collection;
    var purchase = function(id, collection, cb) {
      fetch('/users/transactions', {
        method: 'POST',
        mode: 'cors',
        headers: {
          Authorization: 'Basic',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body:
          'method=POST&username=' +
          userCookie.user.username +
          '&collection=' +
          userCookie.user.collection +
          '&type=model purchases&description=model purchases+' +
          id +
          ' for $ 10.00' +
          '&amount=' +
          self.state.price +
          '&sceneId=' +
          id,
      }).then(function(response) {
        response.json().then(function(result) {
          if (result) {
            cb(null, result);
          } else {
            cb(true);
          }
        });
      });
    };
    purchase(sceneId, collection, function(err, resutl) {
      if (err) {
        self.setState({ buyError: true });
        return;
      }
      self.openRoute('/store');
    });
  }

  switchRenderingMode(mode) {
    this.setState({ renderingMode: mode });
  }

  render() {
    var userCookie = cookie.load('user');
    if (
      typeof userCookie === 'undefined' ||
      userCookie.user.username === 'guest'
    ) {
      this.openRoute('/');
      return null;
    }
    const playerStyle = {
      position: 'relative',
      height: '100%',
      width: '100%',
      minWidth: '1px',
      minHeight: '1px',
      backgroundColor: 'transparent',
    };
    const playerStyleA6100 = {
      position: 'absolute',
      top: '20%',
      marginLeft: '25%',
      height: '50%',
      width: '50%',
      minWidth: '1px',
      minHeight: '1px',
      backgroundColor: 'transparent',
    };

    const buyErrorActions = [
      <FlatButton
        label="Purchase vit"
        primary={true}
        onTouchTap={ev => {
          window.location.assign('/home/balance');
        }}
      />,
      <FlatButton
        label="Back"
        onTouchTap={ev => {
          this.setState({ noVitokensOpen: false });
        }}
      />,
    ];

    const { sceneId } = this.props.params;
    var balance;
    if (!this.state.balance) return null;
    balance = this.state.balance;
    const A6100 = /A6100/.test(navigator.userAgent);
    return (
      <div className={styles.container}>
        <div className={styles.appBar}>
          <UIAppBar
            titleText="Item View"
            leftIcon={
              <IconButton
                iconStyle={{ color: 'white' }}
                onTouchTap={this.openStore}
              >
                <NavigationBack />
              </IconButton>
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
                    this.state.liked
                      ? { color: 'rgb(242, 82, 104)' }
                      : { color: 'white' }
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
        <div className={styles.mainBlock}>
          <div className={styles.header}>
            <div className={styles.title}>
              {this.state.sceneName}
              {this.state.access ? (
                <RaisedButton
                  className={styles.buyItem}
                  disabled={true}
                  primary={true}
                  label="Purchased"
                />
              ) : (
                <RaisedButton
                  className={styles.buyItem}
                  onTouchTap={this.PurchaseStation}
                  primary={true}
                  label="Buy vit 1.0K"
                />
              )}
            </div>
            <div className={styles.author}>
              <span>By</span>
              <div style={{ marginLeft: 10, display: 'flex' }}>
                {this.state.owner ? (
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
            playerStyle={A6100 ? playerStyleA6100 : playerStyle}
            ref="player"
            sceneId={sceneId}
          />
        </div>
        <MyDialog
          message={'Not enough vit'}
          dialogOpen={this.state.buyError}
          actions={buyErrorActions}
          handleClose={ev => {
            this.setState({ buyError: false });
          }}
        />
        <Drawer
          docked={false}
          width={300}
          open={this.state.commentsOpen}
          openSecondary={true}
          onRequestChange={open => this.setState({ commentsOpen: open })}
        >
          <CommentCard sceneId={sceneId} />
        </Drawer>
        <div className={styles.ViTokens}>
          <p style={{ paddingBottom: '5px' }}>
            {' '}
            VIT: {this.showBalance(balance)}{' '}
          </p>
        </div>
      </div>
    );
  }
}

ProductPage.propTypes = {
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
)(ProductPage);
