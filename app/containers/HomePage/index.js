import React, { Component } from 'react';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';
import injectTapEventPlugin from 'react-tap-event-plugin';
import MyDialog from 'components/MyDialog';
import FacebookLogin from 'react-facebook-login';
// import Logo from './freevi-logo.png';
import Logo from './logoVM-2.png';
import moment from 'moment';
import styles from './styles.css';
import cookie from 'react-cookie';

export class HomePage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      dialogOpen: false,
      message: null,
      scope: 'email, user_friends, user_birthday',
      skipMap: /X300|A6100/.test(navigator.userAgent),
    };
  }
  openRoute = route => {
    this.props.changeRoute(route);
  };
  openLoginPage = () => {
    this.openRoute('/users/login');
  };
  openUserPage = username => {
    this.openRoute('/user/' + username);
    //if (this.state.skipMap) {
    // this.openRoute('/user/'+username);
    //}
    // else this.openRoute('/user/world/'+ username);
  };

  fetchCollection(cookie, username, callback) {
    var collection;
    fetch('/users/collection', {
      method: 'POST',
      mode: 'cors',
      headers: {
        Authorization: 'Basic',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body:
        'username=' + username + '&method=GET&name=stationBuilderCollection',
    }).then(function(response) {
      response.json().then(function(json) {
        collection = json.find(function(collection) {
          return collection.name === 'stationBuilderCollection';
        });
        if (typeof collection === 'undefined') {
          fetch('/users/collection', {
            method: 'POST',
            mode: 'cors',
            headers: {
              Authorization: 'Basic',
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body:
              'username=' +
              username +
              '&method=POST&name=stationBuilderCollection',
          }).then(function(response) {
            response.json().then(function(result) {
              return callback(result._id);
            });
          });
        } else {
          return callback(collection._id);
        }
      });
    });
  }

  guestLogin = () => {
    var self = this;
    var guestLogin = function(callback) {
      fetch('/users/login', {
        method: 'POST',
        mode: 'cors',
        headers: {
          Authorization: 'Basic',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'username=guest&password=freevi',
      }).then(function(response) {
        response.json().then(function(json) {
          var body = JSON.parse(json.body);
          var session = {};
          session.headers = json.headers;
          session.user = body.user;
          session.guestlogin = true;
          session.user.noGravatar = true;
          callback(session);
        });
      });
    };
    guestLogin(function(session) {
      cookie.save('user', session, { path: '/' });
      self.openUserPage('guest');
    });
  };

  responseFacebook = responseFacebook => {
    var self = this;
    fetch('/users/facebooklogin', {
      method: 'POST',
      mode: 'cors',
      headers: {
        Authorization: 'Basic',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body:
        'facebookUserId=' +
        responseFacebook.userID +
        '&name=' +
        responseFacebook.name +
        '&email=' +
        responseFacebook.email +
        '&accessToken=' +
        responseFacebook.accessToken,
    }).then(function(response) {
      response.json().then(function(body) {
        if (typeof body.status !== 'undefined' && body.status === 422) {
          self.setState({ message: 'Facebook Login failed', dialogOpen: true });
          return;
        }
        var session = {};
        session.user = body;
        session.user.noGravatar = true;
        session.facebooklogin = true;
        session.avatar = responseFacebook.picture.data.url;
        cookie.save('user', session, { path: '/' });
        if (moment(new Date()) - moment(session.user.createdAt) < 300000) {
          self.openRoute('/tutorial');
        } else self.openUserPage(session.user.username);
      });
    });
  };
  render() {
    var userCookie = cookie.load('user');
    var guest = true;
    if (userCookie && userCookie.guestlogin) {
      cookie.remove('user');
      guest = false;
    } else if (userCookie) {
      this.openUserPage(userCookie.user.username);
      return null;
    }
    return (
      <div className={styles.mainBlock} id="mainBlock">
        <div className={styles.logo}>
          <img
            src={Logo}
            style={{ maxWidth: '100%', maxHeight: '50%', zIndex: 100 }}
            role="presentation"
          />
          <p className={styles.title}> Be Visonary... </p>
          <p className={styles.title}>
            {' '}
            Station Builder 1.0 <i>(ALPHA)</i>{' '}
          </p>
          <p className={styles.subtitle}>
            {' '}
            Room Configurator Software Demo (limited to participants of VIT ICO){' '}
          </p>
        </div>
        <div className={styles.btns}>
          {guest ? (
            <button className={styles.loginGuest} onClick={this.guestLogin}>
              Visit as Guest{' '}
            </button>
          ) : null}
          <FacebookLogin
            appId="1227755663939352"
            autoLoad={false}
            scope={this.state.scope}
            fields="name,email,picture,gender,friends,birthday"
            callback={this.responseFacebook}
            icon="fa-facebook "
            cssClass={styles.loginFacebook}
            textButton=" Login with Facebook"
          />
          <button className={styles.loginFreevi} onClick={this.openLoginPage}>
            {' '}
            Register/login with email{' '}
          </button>
        </div>
        <MyDialog
          message={this.state.message}
          dialogOpen={this.state.dialogOpen}
          handleClose={ev => {
            this.setState({ dialogOpen: false });
          }}
        />
      </div>
    );
  }
}

HomePage.propTypes = {
  changeRoute: React.PropTypes.func,
};

function mapDispatchToProps(dispatch) {
  return {
    changeRoute: url => dispatch(push(url)),
  };
}

// Wrap the component to inject dispatch and state into it
export default connect(
  null,
  mapDispatchToProps
)(HomePage);
