import React, { Component } from 'react';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';
import cookie from 'react-cookie';
import UIAppBar from 'components/UIAppBar';
import TextField from 'material-ui/TextField';
import RaisedButton from 'material-ui/RaisedButton';
import Divider from 'material-ui/Divider';
import IconButton from 'material-ui/IconButton';
import NavigationBack from 'material-ui/svg-icons/navigation/arrow-back';
import $ from 'jquery';
import styles from './styles.css';

function navigationBackButton(func) {
  return (
    <IconButton onClick={func}>
      <NavigationBack />
    </IconButton>
  );
}

export class Login extends Component {
  constructor(props) {
    super(props);
    this.state = {
      username: '',
      password: '',
      usernameError: '',
      passwordError: '',
      skipMap: /A6100/.test(navigator.userAgent),
    };
    this.handleNameChange = this.handleNameChange.bind(this);
    this.handlePassChange = this.handlePassChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleNameChange(event) {
    if (this.state.usernameError != '') {
      this.setState({ usernameError: '' });
    }
    this.setState({ username: event.target.value });
  }

  handlePassChange(event) {
    if (this.state.passwordError != '') {
      this.setState({ passwordError: '' });
    }
    this.setState({ password: event.target.value });
  }

  openRoute = route => {
    this.props.changeRoute(route);
  };

  openNavBack = () => {
    var json = cookie.load('user');
    if (typeof json === 'undefined') {
      this.openRoute('/');
    } else {
      this.openRoute('/user/' + json.user.username);
    }
  };

  openUserPage = user => {
    this.openRoute('/user/' + user);
    //if (this.state.skipMap) this.openRoute('/user/' + user);
    //else this.openRoute('/user/world/' + user);
  };

  openResetPage = () => {
    this.openRoute('/users/password_reset');
  };

  openRegisterPage = () => {
    this.openRoute('/users/new');
  };

  handleSubmit(event) {
    if (event.keyCode && event.keyCode !== 13) return;
    var self = this;
    fetch('/users/login', {
      method: 'POST',
      mode: 'cors',
      headers: {
        Authorization: 'Basic',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body:
        'username=' + self.state.username + '&password=' + self.state.password,
    }).then(function(response) {
      response.json().then(function(body) {
        if (!body.user) {
          if (body.message === 'Unknown user') {
            return self.setState({ usernameError: body.message });
          } else {
            return self.setState({ passwordError: body.message });
          }
        }
        var session = {};
        session.user = body.user;
        session.user.noGravatar = false;
        var username = body.user.username;

        var request = $.ajax({
          url:
            'https://www.gravatar.com/avatar/' +
            session.user.gravatarHash +
            '?d=404',
          type: 'GET',
          crossDomain: true,
        });

        request.always(function(msg) {
          cookie.save('user', session, { path: '/' });
          return self.openUserPage(self.state.username);
        });

        request.fail(function(jqXHR, textStatus) {
          if (jqXHR.status == 404) session.user.noGravatar = true;
        });
      });
    });
  }

  render() {
    var userCookie = cookie.load('user');
    if (typeof userCookie !== 'undefined') {
      this.openUserPage(userCookie.user.username);
      return null;
    }
    return (
      <div className={styles.container}>
        <div className={styles.appBar}>
          <UIAppBar
            titleText="Login"
            leftIcon={navigationBackButton(this.openNavBack)}
          />
        </div>
        <div className={styles.mainBlock}>
          <div>
            <h2 style={{ marginLeft: '15%' }}>Login</h2>
            <Divider />
            <p className={styles.signUp}>
              Don't have an account?
              <a className={styles.link} onClick={this.openRegisterPage}>
                <font color="#1cc9df"> Sign up here.</font>
              </a>
            </p>

            <div className={styles.textField1}>
              <TextField
                errorText={this.state.usernameError}
                floatingLabelText="Username or Email"
                onChange={this.handleNameChange}
                underlineShow={true}
                onKeyDown={this.handleSubmit}
                floatingLabelStyle={{ fontSize: 20, fontWeight: 'bold' }}
              />
            </div>

            <div className={styles.textField2}>
              <TextField
                errorText={this.state.passwordError}
                floatingLabelText="Password"
                onChange={this.handlePassChange}
                underlineShow={true}
                type="password"
                floatingLabelStyle={{ fontSize: 20, fontWeight: 'bold' }}
                onKeyDown={this.handleSubmit}
              />
            </div>

            <p className={styles.resetPass}>
              {' '}
              Forget your password?
              <a className={styles.link} onClick={this.openResetPage}>
                <font color="#1cc9df"> Reset your password here.</font>
              </a>
            </p>
            <div className={styles.button}>
              <RaisedButton
                label="Login"
                style={{ margin: '12px', smarginLeft: '20px' }}
                primary={true}
                onTouchTap={this.handleSubmit}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
}

Login.propTypes = {
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
)(Login);
