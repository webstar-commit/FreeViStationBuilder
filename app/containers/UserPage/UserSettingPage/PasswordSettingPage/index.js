import React, { Component } from 'react';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';
import TextField from 'material-ui/TextField';
import RaisedButton from 'material-ui/RaisedButton';
import UIAppBar from 'components/UIAppBar';
import MyDialog from 'components/MyDialog';
import Divider from 'material-ui/Divider';
import FlatButton from 'material-ui/FlatButton';
import UIUserDrawer from 'components/UIUserDrawer';
import cookie from 'react-cookie';
import styles from './styles.css';

export class Password extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      password_reError: '',
      oldpassError: '',
      newpassError: '',
      dialogOpen: false,
    };
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  openRoute = route => {
    this.props.changeRoute(route);
  };

  openUserpage = () => {
    var userCookie = cookie.load('user');
    this.openRoute('/user/' + userCookie.user.username);
  };

  openEmailPage = username => {
    this.openRoute('/home/settings/email');
  };

  openProfilePage = route => {
    this.openRoute('/home/settings/profile');
  };
  handleDialogClose(event) {
    this.setState({ dialogOpen: false });
  }
  handleSubmit(event) {
    var self = this;
    var oldpass = this.refs.oldPassword.getValue();
    var newpass = this.refs.newPassword.getValue();
    var newpassRe = this.refs.newPasswordRe.getValue();
    if (oldpass.length < 6) {
      this.setState({ oldpassError: 'Password length should be at least 6' });
      return;
    } else if (newpass.length < 6) {
      this.setState({ newpassError: 'Password length should be at least 6' });
      return;
    } else if (newpass !== newpassRe) {
      return this.setState({
        password_reError: 'Password and confirm password are not the same',
      });
    }
    var userCookie = cookie.load('user');
    fetch('/home/settings/password', {
      method: 'POST',
      mode: 'cors',
      headers: {
        Authorization: 'Basic',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'username=' + userCookie.user.username + '&password=' + newpass,
    }).then(function(response) {
      response.json().then(function(json) {
        if (json.statusCode == 200) {
          self.setState({ dialogOpen: true });
        } else {
        }
      });
    });
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
    return (
      <div className={styles.container}>
        <div className={styles.appBar}>
          <UIAppBar
            titleText={'My Password'}
            leftIcon={
              <div style={{ paddingLeft: 10 }}>
                <UIUserDrawer />
              </div>
            }
          />
        </div>
        <div className={styles.mainBlock}>
          <div>
            <h2 className={styles.title}>Password</h2>
            <Divider />
            <div className={styles.textField1}>
              <TextField
                ref="oldPassword"
                errorText={this.state.oldpassError}
                floatingLabelText="Old Password"
                underlineShow={true}
                type="password"
                floatingLabelStyle={{ fontSize: 20, fontWeight: 'bold' }}
              />
            </div>
            <div className={styles.textField2}>
              <TextField
                ref="newPassword"
                floatingLabelText="New Password"
                errorText={this.state.newpassError}
                underlineShow={true}
                type="password"
                floatingLabelStyle={{ fontSize: 20, fontWeight: 'bold' }}
              />
            </div>
            <div className={styles.textField3}>
              <TextField
                ref="newPasswordRe"
                floatingLabelText="Confirm New Password"
                errorText={this.state.password_reError}
                underlineShow={true}
                type="password"
                floatingLabelStyle={{ fontSize: 20, fontWeight: 'bold' }}
              />
            </div>
            <RaisedButton
              className={styles.button}
              label="Change Password"
              primary={true}
              onTouchTap={this.handleSubmit}
            />
          </div>
          <MyDialog
            message={'Password changes saved'}
            dialogOpen={this.state.dialogOpen}
            handleClose={ev => this.handleDialogClose()}
          />
        </div>
      </div>
    );
  }
}

Password.propTypes = {
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
)(Password);
