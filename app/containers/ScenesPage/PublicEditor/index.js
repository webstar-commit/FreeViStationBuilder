import React, { Component } from 'react';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';
import EditorPage from '../EditorPage';
import cookie from 'react-cookie';
import { FlatButton, RadioButton, Dialog, TextField } from 'material-ui';

const styles = {
  radioButton: {
    marginTop: 16,
  },
};

export class PublicEditor extends Component {
  constructor(props) {
    super(props);
    this.state = {
      open: false,
    };
    this.guestLogin = this.guestLogin.bind(this);
    this.openNavBack = this.openNavBack.bind(this);
    this.handleClose = this.handleClose.bind(this);
  }

  componentDidMount() {
    const userCookie = cookie.load('user');
    if (!userCookie) this.guestLogin();
  }

  guestLogin() {
    var self = this;
    const user = document.getElementById('username');
    const pass = document.getElementById('password');
    const username = (user && user.value) || 'ziyang22';
    const password = (pass && pass.value) || 'wwwsss';

    var guestLogin = function(callback) {
      fetch('/users/login', {
        method: 'POST',
        mode: 'cors',
        headers: {
          Authorization: 'Basic',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `username=${username}&password=${password}`,
      }).then(function(response) {
        response.json().then(function(json) {
          var body = JSON.parse(json.body);
          if (body.status === 422 || body.errors) {
            self.setState({ passwordError: 'Login failed' });
          } else {
            var session = {};
            session.headers = json.headers;
            session.user = body.user;
            if (username === 'ziyang22') session.guestlogin = true;
            session.user.noGravatar = true;
            callback(session);
          }
        });
      });
    };
    guestLogin(function(session) {
      cookie.save('user', session, { path: '/' });
      self.setState({ loaded: true, open: false });
      if (username !== 'ziyang22') self.props.changeRoute('/templates');
    });
  }

  openNavBack() {
    this.setState({ open: true, passwordError: '' });
  }
  handleClose() {
    this.setState({ open: false });
  }

  render() {
    const actions = [
      <FlatButton label="Cancel" onClick={this.handleClose} />,
      <FlatButton
        label="Login"
        primary={true}
        keyboardFocused={true}
        onClick={this.guestLogin}
      />,
      <FlatButton
        label="Signup"
        primary={true}
        style={{ float: 'left' }}
        onClick={() => {
          cookie.remove('user', { path: '/' });
          this.props.changeRoute('/users/new');
        }}
      />,
    ];

    const sceneId = this.props.params;
    const userCookie = cookie.load('user');
    if (!userCookie) return null;
    console.log('Iframe....', window.devicePixelRatio);
    const username = userCookie.user && userCookie.user.username;
    return (
      <div>
        <EditorPage
          sceneId={sceneId}
          openNavBack={username === 'ziyang22' ? this.openNavBack : null}
        />
        <Dialog
          title="User Login"
          actions={actions}
          modal={false}
          open={this.state.open}
          onRequestClose={this.handleClose}
          autoScrollBodyContent={true}
        >
          <div className={styles.textField1}>
            <TextField
              id="username"
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
              id="password"
              errorText={this.state.passwordError}
              floatingLabelText="Password"
              onChange={this.handlePassChange}
              underlineShow={true}
              type="password"
              floatingLabelStyle={{ fontSize: 20, fontWeight: 'bold' }}
              onKeyDown={this.handleSubmit}
            />
          </div>
        </Dialog>
      </div>
    );
  }
}

PublicEditor.propTypes = {
  changeRoute: React.PropTypes.func,
};

function mapDispatchToProps(dispatch) {
  return {
    changeRoute: url => dispatch(push(url)),
  };
}

export default connect(null, mapDispatchToProps)(PublicEditor);
