import React, { Component } from 'react';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';
import UIAppBar from 'components/UIAppBar';
import cookie from 'react-cookie';
import styles from './styles.css';
import conf from '../../../conf';
import Card, { CardActions, CardText, CardHeader } from 'material-ui/Card';

import TextField from 'material-ui/TextField';
import NavigationBack from 'material-ui/svg-icons/navigation/arrow-back';
import RaisedButton from 'material-ui/RaisedButton';
import IconButton from 'material-ui/IconButton';

export class PlanPage extends Component {
  constructor(props) {
    super(props);
    var temp = 5 / 462.82;
    var userCookie = cookie.load('user');
    this.state = {
      error: '',
      btnDisabled: false,
      vitAmount: '5,000',
      VITAmount: '5.00',
      ethAmount: temp,
      walletAddress: userCookie.user.ethaddress,
      stylePackage1: { border: '4px solid #aaa' },
      stylePackage2: { border: '4px solid #fff' },
      stylePackage3: { border: '4px solid #fff' },
    };
    this.addPackage1 = this.addPackage1.bind(this);
    this.addPackage2 = this.addPackage2.bind(this);
    this.addPackage3 = this.addPackage3.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.checkBalance = this.checkBalance.bind(this);
    this.checkTransaction = this.checkTransaction.bind(this);
    this.createTransaction = this.createTransaction.bind(this);
    this.topupVIT = this.topupVIT.bind(this);
  }

  openRoute = route => {
    this.props.changeRoute(route);
  };

  checkBalance(address) {
    var self = this;
    var vitoken = self.vitAmount;
    fetch(
      `https://api.etherscan.io/api?module=account&action=balance&address=${encodeURIComponent(
        address
      )}&tag=latest`
    )
      .then(function(response) {
        if (response.status === 200) return response.json();
        return Promise.reject();
      })
      .then(function(json) {
        if (json.status === '1') {
          self.createTransaction(vitoken);
        } else {
          self.setState({
            error: 'no balance in your account',
            btnDisabled: false,
          });
        }
      })
      .catch(e => {
        console.log('Failed to fetch balacne');
      });
  }

  createTransaction(value) {
    var self = this;
    var userCookie = cookie.load('user');
    fetch('/users/ethtransactions', {
      method: 'POST',
      mode: 'cors',
      headers: {
        Authorization: 'Basic',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body:
        'method=POST&username=' +
        userCookie.user.username +
        '&address' +
        userCookie.user.ethaddress +
        '&type=buying funds&description=buying Vitokens' +
        '&amount=' +
        value +
        '&ethAmount=' +
        self.ethAmount,
    }).then(function(response) {
      response.json().then(function(result) {
        if (result.status === 'success') {
          var transaction = result.transaction;
          self.checkTransaction(transaction);
        } else self.setState({ error: 'fail to create transactions', btnDisabled: false });
      });
    });
  }

  checkTransaction(transaction) {
    var self = this;
    fetch(
      `https://api.etherscan.io/api?module=transaction&action=gettxreceiptstatus&txhash=${encodeURIComponent(
        transaction
      )}`
    )
      .then(function(response) {
        if (response.status === 200) return response.json();
        return Promise.reject();
      })
      .then(function(result) {
        if (result.status === '1') {
          self.topupVIT();
        } else self.setState({ error: 'No transaction' });
      })
      .catch(e => {
        console.log('Error to check transaction');
      });
  }

  topupVIT() {
    var self = this;
    fetch('/users/message', {
      method: 'POST',
      mode: 'cors',
      headers: {
        Authorization: 'Basic',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body:
        'method=POST&username=' +
        userCookie.user.username +
        '&type=topup&description=topup vitoken' +
        '&amount=' +
        self.vitAmount,
    }).then(function(response) {
      response.json().then(function(result) {
        if (result.status === 'success') {
          var query = window.location.search;
          if (query && query.indexOf('sceneId') !== -1) {
            var params = query.split('=');
            self.openRoute('/station/' + params[1] + '/builder');
          } else self.openRoute('/home/balance');
        } else self.setState({ error: json.message });
      });
    });
  }

  handleSubmit = () => {
    var vitAmount = this.refs.vitAmount.getValue();
    var VITAmount = this.refs.VITAmount.getValue();
    var ethAmount = this.refs.ethAmount.getValue();
    var walletAddress = this.refs.walletAddress.getValue();
    console.log(vitAmount);

    console.log(VITAmount);

    console.log(ethAmount);

    console.log(walletAddress);
    //this.checkBalance(walletAddress);
  };

  addPackage1() {
    this.setState({ vitAmount: '5,000' });
    this.setState({ VITAmount: '5.00' });
    var temp = 5 / 462.82;
    this.setState({ ethAmount: temp });
    this.setState({ stylePackage1: { border: '4px solid #aaa' } });
    this.setState({ stylePackage2: { border: '4px solid #fff' } });
    this.setState({ stylePackage3: { border: '4px solid #fff' } });
  }

  addPackage2() {
    this.setState({ vitAmount: '25,000' });
    this.setState({ VITAmount: '25.00' });
    var temp = 25 / 462.82;
    this.setState({ ethAmount: temp });
    this.setState({ stylePackage2: { border: '4px solid #aaa' } });
    this.setState({ stylePackage1: { border: '4px solid #fff' } });
    this.setState({ stylePackage3: { border: '4px solid #fff' } });
  }

  addPackage3() {
    this.setState({ vitAmount: '100,000' });
    this.setState({ VITAmount: '100.00' });
    var temp = 100 / 462.82;
    this.setState({ ethAmount: temp });
    this.setState({ stylePackage3: { border: '4px solid #aaa' } });
    this.setState({ stylePackage1: { border: '4px solid #fff' } });
    this.setState({ stylePackage2: { border: '4px solid #fff' } });
  }

  componentWillmount() {
    this.addPackage1();
    this.addPackage2();
    this.addPackage3();
  }

  componentDidmount() {
    console.log('aaaa');
  }

  render() {
    const errorMsg = this.state.error;
    return (
      <div className={styles.container}>
        <UIAppBar
          titleText="Pay With VIT"
          leftIcon={
            <IconButton
              onTouchTap={ev => {
                this.openRoute('/home/balance');
              }}
              iconStyle={{ color: 'white' }}
            >
              <NavigationBack />
            </IconButton>
          }
        />
        <div className={styles.mainBlock}>
          <div className={styles.title}> Pay With VIT </div>
          <div className={styles.error}>{errorMsg}</div>
          <div className={styles.row}>
            <label className={styles.label}>Top up with:</label>

            <div className={styles.row}>
              <Card className={styles.package} style={this.state.stylePackage1}>
                <CardHeader className={styles.packageText}>
                  <p>5,000</p>
                  <p>vit's</p>
                </CardHeader>
                <CardActions className={styles.packageButton}>
                  <RaisedButton
                    disabled={this.state.btnDisabled}
                    onTouchTap={this.addPackage1}
                    primary={true}
                    label="ADD"
                  />
                </CardActions>
              </Card>
              <Card className={styles.package} style={this.state.stylePackage2}>
                <CardHeader className={styles.packageText}>
                  <p>25,000</p>
                  <p>vit's</p>
                </CardHeader>
                <CardActions className={styles.packageButton}>
                  <RaisedButton
                    disabled={this.state.btnDisabled}
                    onTouchTap={this.addPackage2}
                    primary={true}
                    label="ADD"
                  />
                </CardActions>
              </Card>
              <Card className={styles.package} style={this.state.stylePackage3}>
                <CardHeader className={styles.packageText}>
                  <p>100,000</p>
                  <p>vit's</p>
                </CardHeader>
                <CardActions className={styles.packageButton}>
                  <RaisedButton
                    disabled={this.state.btnDisabled}
                    onTouchTap={this.addPackage3}
                    primary={true}
                    label="ADD"
                  />
                </CardActions>
              </Card>
            </div>
          </div>
          <div className={styles.row}>
            <label className={styles.label}>Top up with:</label>
            <div className={styles.field}>
              <TextField
                ref="vitAmount"
                hintText=""
                className={styles.textinput}
                value={this.state.vitAmount}
              />
              <label>vit's</label>
            </div>
          </div>
          <div className={styles.row}>
            <label className={styles.label}>Send:</label>
            <div className={styles.field}>
              <TextField
                ref="VITAmount"
                hintText=""
                className={styles.textinput}
                value={this.state.VITAmount}
              />
              <label>VIT</label>
            </div>
          </div>
          <div className={styles.row}>
            <label className={styles.label}>Send:</label>
            <div className={styles.field}>
              <TextField
                ref="ethAmount"
                hintText=""
                className={styles.textinput}
                value={this.state.ethAmount}
              />
              <label>ETH</label>
            </div>
          </div>
          <div className={styles.row}>
            <label className={styles.label}>To the following address:</label>
            <div className={styles.field}>
              <TextField
                ref="walletAddress"
                hintText=""
                fullWidth={true}
                value={this.state.walletAddress}
              />
            </div>
          </div>
          <div className={styles.submit} style={{ bottom: 20 }}>
            <RaisedButton
              className={styles.vitbutton}
              disabled={this.state.btnDisabled}
              onTouchTap={this.handleSubmit}
              primary={true}
              label="Pay"
            />
          </div>
        </div>
      </div>
    );
  }
}

function mapDispatchToProps(dispatch) {
  return {
    changeRoute: url => dispatch(push(url)),
  };
}
export default connect(
  null,
  mapDispatchToProps
)(PlanPage);
