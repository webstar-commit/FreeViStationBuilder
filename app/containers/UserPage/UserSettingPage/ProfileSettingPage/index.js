import React, { Component } from 'react';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';
import TextField from 'material-ui/TextField';
import RaisedButton from 'material-ui/RaisedButton';
import UIAppBar from 'components/UIAppBar';
import Divider from 'material-ui/Divider';
import Menu from 'material-ui/Menu';
import MenuItem from 'material-ui/MenuItem';
import cookie from 'react-cookie';
import UIUserDrawer from 'components/UIUserDrawer';
import FlatButton from 'material-ui/FlatButton';
import Paper from 'material-ui/Paper';
import ActionHome from 'material-ui/svg-icons/action/home';
import styles from './styles.css';
import MyDialog from 'components/MyDialog';

export class Profile extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      userInfo: null,
      dialogOpen: false,
    };
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  openRoute = route => {
    this.props.changeRoute(route);
  };

  openUserpage = () => {
    var json = cookie.load('user');
    this.openRoute('/user/' + json.user.username);
  };

  openEmailPage = () => {
    this.openRoute('/home/settings/email');
  };

  openPasswordPage = route => {
    this.openRoute('/home/settings/password');
  };

  handleDialogClose(event) {
    this.setState({ dialogOpen: false });
  }

  handleSubmit(event) {
    var userCookie = cookie.load('user');
    var self = this;
    var name = this.refs.name.getValue();
    var username = this.refs.username.getValue();
    var job = this.refs.job.getValue();
    var company = this.refs.company.getValue();
    var city = this.refs.city.getValue();
    var country = this.refs.country.getValue();
    var email = this.refs.email.getValue();
    var website = this.refs.website.getValue();
    var url = this.refs.url.getValue();
    var facebook = this.refs.facebook.getValue();
    var google = this.refs.google.getValue();
    var twitter = this.refs.twitter.getValue();
    var linkedin = this.refs.linkedin.getValue();
    var Sketchfab = this.refs.Sketchfab.getValue();
    var reqBody =
      'username=' +
      username +
      (name ? '&name=' + name : '') +
      (job ? '&jobTitle=' + job : '') +
      (company ? '&employer=' + company : '') +
      (city ? '&city=' + city : '') +
      (country ? '&country=' + country : '') +
      (email ? '&gravatar=' + email : '') +
      (website ? '&website=' + website : '') +
      (url ? '&portfolio=' + url : '') +
      (facebook ? '&facebook=' + facebook : '') +
      (google ? '&googleplus=' + google : '') +
      (twitter ? '&twitter=' + twitter : '') +
      (linkedin ? '&linkedin=' + linkedin : '') +
      (Sketchfab ? '&sketchfab=' + Sketchfab : '');

    fetch('/home/settings/profile', {
      method: 'POST',
      mode: 'cors',
      headers: {
        Authorization: 'Basic',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: reqBody,
    }).then(function(response) {
      response.json().then(function(json) {
        if (json.statusCode == 200) {
          var info = JSON.parse(json.body);
          userCookie.user = info;
          cookie.save('user', userCookie, { path: '/', maxAge: 3600 * 6 });
          self.setState({ dialogOpen: true });
        } else {
        }
      });
    });
    //TODO: update user in database
  }
  componentWillMount() {
    var userCookie = cookie.load('user');
    this.setState({ userInfo: userCookie.user });
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
        <div className={styles.appbar}>
          <UIAppBar titleText={'Profile Setting'} leftIcon={<UIUserDrawer />} />
        </div>

        <div className={styles.mainBlock}>
          <div>
            <h2 style={{ margin: '25px' }}>Profile</h2>
            <Divider />
            <div className={styles.leftBlock}>
              <TextField
                value={userCookie.user.username}
                ref="username"
                floatingLabelText="Username"
                underlineShow={true}
                disabled={true}
                floatingLabelStyle={{ fontSize: 20, fontWeight: 'bold' }}
              />
              <br />
              <TextField
                ref="name"
                floatingLabelText="Name"
                defaultValue={this.state.userInfo.name}
                floatingLabelStyle={styles.floatingLabelStyle}
                underlineShow={true}
                floatingLabelStyle={{ fontSize: 20, fontWeight: 'bold' }}
              />
              <br />
              <TextField
                ref="job"
                floatingLabelText="Job Ttile"
                defaultValue={this.state.userInfo.jobTitle}
                underlineShow={true}
                floatingLabelStyle={{ fontSize: 20, fontWeight: 'bold' }}
              />
              <br />
              <TextField
                ref="company"
                floatingLabelText="Company"
                defaultValue={this.state.userInfo.employer}
                underlineShow={true}
                floatingLabelStyle={{ fontSize: 20, fontWeight: 'bold' }}
              />
              <br />
              <TextField
                ref="city"
                floatingLabelText="City"
                defaultValue={this.state.userInfo.city}
                underlineShow={true}
                floatingLabelStyle={{ fontSize: 20, fontWeight: 'bold' }}
              />
              <br />
              <TextField
                ref="country"
                floatingLabelText="Country"
                defaultValue={this.state.userInfo.country}
                underlineShow={true}
                floatingLabelStyle={{ fontSize: 20, fontWeight: 'bold' }}
              />
              <br />
              <TextField
                ref="email"
                floatingLabelText="Gravatar Email"
                defaultValue={this.state.userInfo.gravatar}
                underlineShow={true}
                floatingLabelStyle={{ fontSize: 20, fontWeight: 'bold' }}
              />
            </div>
            <div className={styles.rightBlock}>
              <TextField
                ref="website"
                floatingLabelText="Website"
                defaultValue={this.state.userInfo.website}
                underlineShow={true}
                floatingLabelStyle={{ fontSize: 20, fontWeight: 'bold' }}
              />
              <br />
              <TextField
                ref="url"
                floatingLabelText="Portfolio URL"
                defaultValue={this.state.userInfo.portfolio}
                underlineShow={true}
                floatingLabelStyle={{ fontSize: 20, fontWeight: 'bold' }}
              />
              <br />
              <TextField
                ref="facebook"
                floatingLabelText="Facebook Username"
                defaultValue={this.state.userInfo.facebook}
                underlineShow={true}
                floatingLabelStyle={{ fontSize: 20, fontWeight: 'bold' }}
              />
              <br />
              <TextField
                ref="google"
                floatingLabelText="Google Plus Username"
                defaultValue={this.state.userInfo.googleplus}
                underlineShow={true}
                floatingLabelStyle={{ fontSize: 20, fontWeight: 'bold' }}
              />
              <br />
              <TextField
                ref="twitter"
                floatingLabelText="Twitter Username"
                defaultValue={this.state.userInfo.twitter}
                underlineShow={true}
                floatingLabelStyle={{ fontSize: 20, fontWeight: 'bold' }}
              />
              <br />
              <TextField
                ref="linkedin"
                floatingLabelText="Linked In Username"
                defaultValue={this.state.userInfo.linkedin}
                underlineShow={true}
                floatingLabelStyle={{ fontSize: 20, fontWeight: 'bold' }}
              />
              <br />
              <TextField
                ref="Sketchfab"
                floatingLabelText="Sketchfab Username"
                defaultValue={this.state.userInfo.sketchfab}
                underlineShow={true}
                floatingLabelStyle={{ fontSize: 20, fontWeight: 'bold' }}
              />
            </div>
            <RaisedButton
              className={styles.button}
              primary={true}
              label="Save Profile"
              onTouchTap={this.handleSubmit}
            />
            <MyDialog
              message={'Profile changes saved'}
              dialogOpen={this.state.dialogOpen}
              handleClose={ev => this.handleDialogClose()}
            />
          </div>
        </div>
      </div>
    );
  }
}
Profile.propTypes = {
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
)(Profile);
