import React, { Component } from 'react';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';
import cookie from 'react-cookie';
import DatePicker from 'material-ui/DatePicker';
import UIAppBar from 'components/UIAppBar';
import SelectField from 'material-ui/SelectField';
import MenuItem from 'material-ui/MenuItem';
import Divider from 'material-ui/Divider';
import TextField from 'material-ui/TextField';
import RaisedButton from 'material-ui/RaisedButton';
import IconButton from 'material-ui/IconButton';
import NavigationBack from 'material-ui/svg-icons/navigation/arrow-back';
import styles from './styles.css';
//import Web3EthAccounts from 'web3-eth-accounts'
import conf from '../../../conf';

function navigationBackButton(func) {
  return (
    <IconButton onClick={func}>
      <NavigationBack />
    </IconButton>
  );
}

export class Register extends Component {
  constructor(props) {
    super(props);
    this.state = {
      name: '',
      username: '',
      userError: '',
      password: '',
      passwordError: '',
      password_re: '',
      password_reError: '',
      email: '',
      emailError: '',
      gender: '',
      ethaddress: '',
    };
    this.handleNameChange = this.handleNameChange.bind(this);
    this.handleUserChange = this.handleUserChange.bind(this);
    this.handlePassChange = this.handlePassChange.bind(this);
    this.handleConfirmChange = this.handleConfirmChange.bind(this);
    this.handleEmailChange = this.handleEmailChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleGenderChange = this.handleGenderChange.bind(this);
  }

  handleNameChange(event) {
    this.setState({ name: event.target.value });
  }

  handleUserChange(event) {
    if (this.state.userError != '') {
      this.setState({ userError: '' });
    }
    this.setState({ username: event.target.value });
  }

  handlePassChange(event) {
    var pass = event.target.value;
    var validate = {
      digits: /\d/.test(pass),
      lower: /[a-z]/.test(pass),
      upper: /[A-Z]/.test(pass),
    };
    this.setState({ password: event.target.value });
    if (this.state.password.length < 5) {
      this.setState({ passwordError: 'Password length should be at least 6' });
    } else if (!validate.digits) {
      this.setState({ passwordError: 'Password should have at least a digit' });
    } else if (!validate.lower) {
      this.setState({
        passwordError: 'Password should have at least a lower case letter',
      });
    } else if (!validate.upper) {
      this.setState({
        passwordError: 'Password should have at least a upper case letter',
      });
    } else {
      this.setState({ passwordError: '' });
    }
  }

  handleConfirmChange(event) {
    if (this.state.password_reError != '') {
      this.setState({ password_reError: '' });
    }
    this.setState({ password_re: event.target.value });
  }

  handleEmailChange(event) {
    this.setState({ email: event.target.value });
    if (
      this.state.email &&
      !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{1,4}$/i.test(this.state.email)
    ) {
      this.setState({ emailError: 'Invalid email address ' });
    } else {
      this.setState({ emailError: '' });
    }
  }

  handleGenderChange(event, index, value) {
    this.setState({ gender: value });
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

  openUserPage = username => {
    this.openRoute('/user/' + username);
  };

  openLoginPage = route => {
    this.openRoute('/users/login');
  };

  handleSubmit = event => {
    // var account = new (Web3EthAccounts)('ws://localhost:8546');

    // var wallet = account.create();

    // this.state.ethaddress = wallet.address;

    // console.log(this.state.ethaddress);
    // console.log(wallet.privateKey);

    var self = this;
    if (this.state.passwordError != '' || this.state.emailError != '') {
      return;
    }

    if (this.state.password_re !== this.state.password) {
      this.setState({
        password_reError: 'Password and confirm password are not the same',
      });
      return;
    }
    var username = this.state.username.trim();
    fetch('/users/new', {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body:
        'username=' +
        username +
        '&password=' +
        self.state.password +
        '&name=' +
        self.state.name +
        '&email=' +
        self.state.email +
        '&ethaddress' +
        self.state.ethaddress,
    }).then(function(response) {
      response.json().then(function(body) {
        if (body.status === 422) {
          if (body.message.indexOf('Username') !== -1) {
            self.setState({ userError: body.message });
          } else {
            self.setState({ emailError: body.message });
          }
        } else {
          var session = {};
          session.user = body;
          session.user.collection = '';
          session.user.noGravatar = true;
          cookie.save('user', session, { path: '/' });
          self.openRoute('/tutorial');
        }
      });
    });
  };

  render() {
    var userCookie = cookie.load('user');
    if (typeof userCookie !== 'undefined') {
      this.openUserPage(userCookie.user.username);
      return null;
    }
    var maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() - 15);
    return (
      <div className={styles.container}>
        <div className={styles.appBar}>
          <UIAppBar
            titleText="Signup"
            leftIcon={navigationBackButton(this.openNavBack)}
          />
        </div>
        <h2 style={{ margin: '25px', marginLeft: '10%' }}>Signup</h2>
        <Divider />

        <p className={styles.login}>
          {' '}
          Already have an account?
          <a className={styles.link} onClick={this.openLoginPage}>
            <font color="#1cc9df"> Login here.</font>
          </a>
        </p>

        <div className={styles.textField1}>
          <TextField
            floatingLabelText="Name"
            onChange={this.handleNameChange}
            underlineShow={true}
            floatingLabelStyle={{ fontSize: 20, fontWeight: 'bold' }}
          />
        </div>
        <div className={styles.textField2}>
          <TextField
            floatingLabelText="Username"
            errorText={this.state.userError}
            onChange={this.handleUserChange}
            underlineShow={true}
            floatingLabelStyle={{ fontSize: 20, fontWeight: 'bold' }}
          />
        </div>
        <div className={styles.textField3}>
          <TextField
            errorText={this.state.passwordError}
            floatingLabelText="Password"
            onChange={this.handlePassChange}
            underlineShow={true}
            type="password"
            floatingLabelStyle={{ fontSize: 20, fontWeight: 'bold' }}
          />
        </div>
        <div className={styles.textField4}>
          <TextField
            errorText={this.state.password_reError}
            floatingLabelText="Confirm Passowrd"
            onChange={this.handleConfirmChange}
            underlineShow={true}
            type="password"
            floatingLabelStyle={{ fontSize: 20, fontWeight: 'bold' }}
          />
        </div>
        <div className={styles.textField5}>
          <TextField
            floatingLabelText="Email Address"
            errorText={this.state.emailError}
            onChange={this.handleEmailChange}
            underlineShow={true}
            floatingLabelStyle={{ fontSize: 20, fontWeight: 'bold' }}
          />
        </div>
        <div className={styles.textField6}>
          <SelectField
            floatingLabelText="Gender"
            value={this.state.gender}
            onChange={this.handleGenderChange}
            floatingLabelStyle={{ fontSize: 20, fontWeight: 'bold' }}
          >
            <MenuItem value={1} primaryText="Male" />
            <MenuItem value={2} primaryText="Female" />
          </SelectField>
        </div>
        <div className={styles.birth}>
          <DatePicker
            floatingLabelText="Date of birth"
            floatingLabelStyle={{ fontSize: 20, fontWeight: 'bold' }}
            autoOk={true}
            onChange={this.handleDateChange}
            maxDate={maxDate}
            defaultDate={maxDate}
          />
        </div>
        <div className={styles.resetPass}>
          <p> By using Vimarket.io, you are agreeing our Terms of Service.</p>
        </div>

        <RaisedButton
          className={styles.button}
          label="Signup"
          primary={true}
          onTouchTap={this.handleSubmit}
        />
      </div>
    );
  }
}

Register.propTypes = {
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
)(Register);
