import React, { Component } from 'react';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';
import TextField from 'material-ui/TextField';
import RaisedButton from 'material-ui/RaisedButton';
import UIAppBar from 'components/UIAppBar';
import Menu from 'material-ui/Menu';
import Divider from 'material-ui/Divider';
import cookie from 'react-cookie';
import styles from './styles.css';
import UIUserDrawer from 'components/UIUserDrawer';
import MyDialog from 'components/MyDialog';
import Checkbox from 'material-ui/Checkbox';
import Dialog from 'material-ui/Dialog';
import Delete from 'material-ui/svg-icons/action/delete';

export class Email extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      newEmail: '',
      emailError: '',
      verifiedEmails: [],
      unVeriryEmails: [],
      addDisable: true,
      dialogOpen: false,
      prefSave: false,
      notification: null,
    };
    this.verifyEmail = this.verifyEmail.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleEmailChange = this.handleEmailChange.bind(this);
    this.handlePreference = this.handlePreference.bind(this);
  }

  openRoute = route => {
    this.props.changeRoute(route);
  };

  verifyEmail(email) {
    var self = this;
    var userCookie = cookie.load('user');
    var User = userCookie.user;
    fetch('/home/settings/email', {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'username=' + User.username + '&email=' + email,
    }).then(function(response) {
      response.json().then(function(json) {
        if (json.statusCode == 200) {
          self.setState({ dialogOpen: true });
        }
      });
    });
  }

  handleEmailChange(event) {
    if (this.state.emailError) {
      this.setState({ emailError: '' });
    }
    this.setState({ newEmail: event.target.value });
    if (
      !this.state.newEmail ||
      (this.state.newEmail &&
        !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{1,4}$/i.test(this.state.newEmail))
    ) {
      this.setState({ addDisable: true });
    } else {
      this.setState({ addDisable: false, newEmail: event.target.value });
    }
  }

  remove(email) {
    var self = this;
    var userCookie = cookie.load('user');
    var emails = this.state.unVeriryEmails;
    var index = emails.indexOf(email);
    emails.splice(index, 1);
    var emailBody = '';
    for (var i = 0; i < emails.length; i++) {
      emailBody += '&emailsUnverified[' + i + ']=' + emails[i];
    }
    fetch('/home/settings/profile', {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'username=' + userCookie.user.username + emailBody,
    }).then(function(response) {
      response.json().then(function(json) {
        if (json.statusCode == 200) {
          var info = JSON.parse(json.body);
          userCookie.user = info;
          cookie.save('user', userCookie, { path: '/', maxAge: 3600 * 6 });
          self.setState({ emailsUnverified: emails });
        }
      });
    });
  }

  handleDialogClose(event) {
    this.setState({ dialogOpen: false, prefSave: false });
  }

  handleSubmit(event) {
    this.setState({ emailError: '' });
    var self = this;
    var newEmail = this.state.newEmail;
    if (
      !newEmail ||
      (newEmail && !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(newEmail))
    ) {
      this.setState({ emailError: 'Invalid email address ' });
      return;
    }
    var userCookie = cookie.load('user');
    fetch('/home/settings/profile', {
      method: 'POST',
      mode: 'cors',
      headers: {
        Authorization: 'Basic',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'username=' + userCookie.user.username + '&newEmail=' + newEmail,
    }).then(function(response) {
      response.json().then(function(json) {
        const user = json.value;
        if (json) {
          userCookie.user = user;
          cookie.save('user', userCookie, { path: '/', maxAge: 3600 * 6 });
          self.setState({
            verifiedEmails: [user.email],
            newEmail: '',
          });
        } else {
          self.setState({
            emailError: 'The email address is already registered',
          });
        }
      });
    });
  }

  componentWillMount() {
    var self = this;
    var userCookie = cookie.load('user');
    var fetchPreferences = function() {
      fetch('/users/preferences', {
        method: 'POST',
        mode: 'cors',
        headers: {
          Authorization: 'Basic',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'username=' + userCookie.user.username + '&method=GET',
      }).then(function(response) {
        response.json().then(function(json) {
          self.setState({ notification: json.notification });
        });
      });
    };
    var targetUser = userCookie.user;
    var emails = [];
    emails.push(userCookie.user.email);
    this.setState({ verifiedEmails: emails });
    //emails = [];
    //this.setState({ unVeriryEmails: emails });

    //fetchPreferences();
  }

  handlePreference(event) {
    var self = this;
    var userCookie = cookie.load('user');
    var notifications = {
      like: this.refs.like.state.switched ? 'true' : 'false',
      newComment: this.refs.newComment.state.switched ? 'true' : 'false',
      commentMention: this.refs.commentMention.state.switched
        ? 'true'
        : 'false',
    };
    var putPreferences = function() {
      fetch('/users/preferences', {
        method: 'POST',
        mode: 'cors',
        headers: {
          Authorization: 'Basic',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body:
          'username=' +
          userCookie.user.username +
          '&method=PUT&notification=' +
          JSON.stringify(notifications),
      }).then(function(response) {
        response.json().then(function(json) {
          self.setState({ prefSave: true });
        });
      });
    };
    putPreferences();
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
    // if (!this.state.notification) return null;
    //const notification = this.state.notification;
    const notification = {};
    return (
      <div className={styles.container}>
        <div className={styles.appBar}>
          <UIAppBar
            titleText={'My Settings'}
            leftIcon={
              <div style={{ paddingLeft: 10 }}>
                <UIUserDrawer />
              </div>
            }
          />
        </div>
        <div className={styles.title}>
          <h2>Emails</h2>
        </div>
        <Divider />
        <div className={styles.email}>
          {this.state.verifiedEmails.map(email => {
            if (email) {
              return <div className={styles.Verifyed}>{email}</div>;
            } else {
              return null;
            }
          })}
          {this.state.unVeriryEmails.map(email => {
            if (email) {
              return (
                <div className={styles.unVerifyed}>
                  {email}
                  <div className={styles.btns}>
                    <RaisedButton
                      className={styles.verifyButton}
                      primary={true}
                      label="Verify"
                      onTouchTap={ev => this.verifyEmail(email)}
                    />
                    <RaisedButton
                      className={styles.deleteButton}
                      icon={<Delete />}
                      onTouchTap={ev => this.remove(email)}
                    />
                  </div>
                </div>
              );
            } else {
              return null;
            }
          })}
        </div>
        <Divider style={{ position: 'relative', marginTop: '3%' }} />

        <div className={styles.newEmail}>
          <TextField
            value={this.state.newEmail}
            floatingLabelText="Chaneg Email"
            underlineShow={true}
            errorText={this.state.emailError}
            onChange={this.handleEmailChange}
            floatingLabelStyle={{ fontSize: 20, fontWeight: 'bold' }}
          />
          <RaisedButton
            className={styles.addButton}
            primary={true}
            label="Update"
            disabled={this.state.addDisable}
            onTouchTap={this.handleSubmit}
          />
        </div>
        <div className={styles.notification}>
          {/*          <h2 style={{margin: '25px'}}>Notifications</h2>
          <div style={{margin:'5%', float:'bottom'}}>
            <Checkbox ref='like' style={{'marginBottom':15}} defaultChecked={notification.like}label="Send me an email if someone likes one of my stations" />
            <Checkbox ref='commentMention' style={{'marginBottom':15}} defaultChecked={notification.commentMention}label="Send me an email if someone mentions me in their comments" />
            <Checkbox ref='newComment' style={{'marginBottom':15}} defaultChecked={notification.newComment} label="Send me an email if someone makes a new comment on one of my stations." />
          </div>
          <RaisedButton  primary={true} onTouchTap={this.handlePreference}className={styles.saveBtn} label='Save' />*/}
          <MyDialog
            message={'Email sent, please check your inbox'}
            dialogOpen={this.state.dialogOpen}
            handleClose={ev => this.handleDialogClose()}
          />
          <MyDialog
            message={'Changes saved'}
            dialogOpen={this.state.prefSave}
            handleClose={ev => this.handleDialogClose()}
          />
        </div>
      </div>
    );
  }
}

Email.propTypes = {
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
)(Email);
