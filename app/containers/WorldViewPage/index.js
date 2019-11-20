import React, { Component } from 'react';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';
import AppBar from 'material-ui/AppBar';
import Menu from 'material-ui/Menu';
import Paper from 'material-ui/Paper';
import moment from 'moment';
import MenuItem from 'material-ui/MenuItem';
import FlatButton from 'material-ui/FlatButton';
import UIUserDrawer from 'components/UIUserDrawer';
import FacebookLogin from 'react-facebook-login';
import cookie from 'react-cookie';
import CircularProgress from 'material-ui/CircularProgress';
import styles from './styles.css';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import getMuiTheme from 'material-ui/styles/getMuiTheme';
import freevilogo from './images/flightdeck-logo.png';
import home from './images/home.png';
import ReactLetterAvatar from 'react-letter-avatar';

require('public/style.css');
require('public/leaflet.css');

require('./js/lib/wrld');
require('./js/lib/jquery.min');
require('./js/lib/jquery.clearsearch.js');

var worldview = require('./js/worldview');
const theme = {
  palette: {
    textColor: 'black',
  },
  color: '#4d4d4d',
  appBar: { color: '#34363a', height: 50 },
};
export class WorldViewPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      viewLoaded: false,
      balance: 0,
      userInfo: null,
    };
  }

  openRoute = route => {
    window.location.assign(route);
    //this.props.changeRoute(route);
  };

  openBalancePage = () => {
    this.openRoute('/home/balance');
  };

  handleSubmit = () => {
    var self = this;
  };
  handleClose = () => {};

  showMoreItem(event) {}
  fetchData = function() {
    var self = this;
    const userCookie = cookie.load('user');
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
          self.setState({
            balance: results.balance,
            userInfo: userCookie.user,
          });
        });
      });
    };
    putData();
  };
  componentWillMount() {
    this.fetchData();
  }
  componentDidMount() {
    var self = this;
    worldview.main(this.props, this.loadFinish.bind(this));
  }
  openTransDetail(transaction) {}

  gotoNewYork() {
    worldview.gotoNewYork();
  }

  gotoShop() {
    worldview.gotoShop();
  }

  loadFinish(bool) {
    this.setState({ viewLoaded: bool });
  }

  gotoBeverlyHill() {
    worldview.gotoBeverlyHill();
  }

  gotoHome() {
    worldview.gotoHome();
  }

  gotoMystation() {
    worldview.gotoMystation();
  }
  showBalance(balance) {
    if (typeof balance === 'undefined' || balance === 0) return '0';
    return balance >= 1000000
      ? (balance / 1000000).toFixed(1) + 'M'
      : balance >= 1000
        ? (balance / 1000).toFixed(1) + 'K'
        : balance.toFixed(0);
  }

  render() {
    var self = this;
    var userCookie = cookie.load('user');
    if (typeof userCookie === 'undefined') {
      userCookie = {
        user: {
          username: 'guest',
          name: 'guest',
          guestlogin: true,
          noGravatar: true,
        },
      };
    }
    const viewLoaded = this.state.viewLoaded;

    return (
      <div className={styles.container}>
        <div className={styles.appBar} id="appbar">
          <MuiThemeProvider muiTheme={getMuiTheme(theme)}>
            <AppBar
              title={
                userCookie.facebooklogin
                  ? userCookie.user.name
                  : userCookie.user.username
              }
              style={{ paddingLeft: 20, paddingRight: 10 }}
              iconElementLeft={
                <div style={{ display: 'flex' }}>
                  <UIUserDrawer />
                  {userCookie.facebooklogin ? (
                    <img
                      onClick={this.gotoMystation}
                      style={{
                        color: 'white',
                        marginLeft: 10,
                        marginTop: 9,
                        cursor: 'pointer',
                        backgroundColor: 'rgb(188,188,188)',
                        borderRadius: '50%',
                        cursor: 'pointer',
                      }}
                      src={userCookie.avatar}
                      width="32px"
                      height="32px"
                    />
                  ) : userCookie.user.username == 'guest' ? (
                    <img
                      onClick={this.gotoMystation}
                      style={{
                        color: 'white',
                        marginLeft: 10,
                        marginTop: 9,
                        cursor: 'pointer',
                        backgroundColor: 'rgb(188,188,188)',
                        borderRadius: '50%',
                        cursor: 'pointer',
                      }}
                      src={'/images/guest.png'}
                      width="32px"
                      height="32px"
                    />
                  ) : userCookie.user.noGravatar ? (
                    <div
                      onClick={this.gotoMystation}
                      style={{
                        width: '30px',
                        height: '10px',
                        paddingTop: '9px',
                        cursor: 'pointer',
                      }}
                    >
                      {' '}
                      <ReactLetterAvatar
                        name={
                          userCookie.user.name
                            ? userCookie.user.name
                            : userCookie.user.username
                        }
                        size={30}
                        radius={15}
                      />{' '}
                    </div>
                  ) : (
                    <img
                      onClick={this.gotoMystation}
                      style={{
                        color: 'white',
                        marginLeft: 10,
                        marginTop: 9,
                        backgroundColor: 'rgb(188,188,188)',
                        borderRadius: '50%',
                        cursor: 'pointer',
                      }}
                      src={
                        this.state.userInfo == null
                          ? 'https://www.gravatar.com/avatar/' +
                            undefined +
                            '?d=https://clara.io/img/default_avatar.png'
                          : 'https://www.gravatar.com/avatar/' +
                            userCookie.user.gravatarHash +
                            '?d=https://clara.io/img/default_avatar.png'
                      }
                      width="32px"
                      height="32px"
                    />
                  )}
                </div>
              }
              iconElementRight={
                <div
                  onClick={this.gotoShop}
                  style={{
                    color: 'white',
                    marginRight: 20,
                    marginTop: 13,
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ color: 'white', fontSize: 15 }}>
                    {' '}
                    vit: {this.showBalance(this.state.balance)}{' '}
                  </span>
                </div>
              }
            />
          </MuiThemeProvider>
        </div>
        <div className={styles.mainBlock} id="mainBlock">
          <div
            className={styles.paper}
            style={{ visibility: viewLoaded ? 'visible' : 'hidden' }}
          >
            <div id="preview">
              <div id="previewContent">
                <div id="logo">
                  <img src={freevilogo} id="freevi" />
                </div>
                <input
                  id="searchInput"
                  type="text"
                  placeholder="Enter a location"
                />
                <a id="clear_input">×</a>
                <div id="top_btn_area" />
                <div id="home_area">
                  <img src={home} id="Home" onClick={this.gotoHome} />
                </div>
              </div>
            </div>
            <div
              style={{
                visibility: viewLoaded ? 'hidden' : 'visible',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                height: '100%',
              }}
            >
              <CircularProgress
                mode="indeterminate"
                size={80}
                style={{ width: '80px', height: '80px' }}
              />
              <h3>Exploring the world</h3>
              <h4>waiting for stations </h4>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

WorldViewPage.propTypes = {
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
)(WorldViewPage);
