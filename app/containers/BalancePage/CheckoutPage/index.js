import React, { Component } from 'react';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';
import UIAppBar from 'components/UIAppBar';
import cookie from 'react-cookie';
import styles from './styles.css';
import conf from '../../../conf';
import TextField from 'material-ui/TextField';
import NavigationBack from 'material-ui/svg-icons/navigation/arrow-back';
import RaisedButton from 'material-ui/RaisedButton';
import IconButton from 'material-ui/IconButton';
const priceList = {
  Basic: 500,
  Standard: 10000,
  Premium: 50000,
  Expert: 100000,
};
const vitokenList = {
  Basic: 3000,
  Standard: 60000,
  Premium: 300000,
  Expert: 2000000,
};

export class PlanPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      error: '',
      btnDisabled: false,
    };
    this.handleSubmit = this.handleSubmit.bind(this);
    this.stripeCharge = this.stripeCharge.bind(this);
  }

  openRoute = route => {
    this.props.changeRoute(route);
  };

  handleVitPayment = () => {
    this.openRoute('/home/Basic/vitpayment');
  };

  handleSubmit() {
    var self = this;
    var cardName = this.refs.cardName.getValue();
    var cardNumber = this.refs.cardNumber.getValue();
    var cardCVV = this.refs.cardCVV.getValue();
    var month = this.refs.month.value;
    var year = this.refs.year.value;
    this.setState({ btnDisabled: true });
    Stripe.setPublishableKey(conf.stripePublishKey);
    Stripe.card.createToken(
      {
        number: cardNumber,
        cvc: cardCVV,
        exp_month: month,
        exp_year: year,
      },
      function(status, response) {
        if (response.error) {
          self.setState({ error: response.error.message, btnDisabled: false });
          return;
        }
        self.stripeCharge(response.id);
      }
    );
  }
  showBalance(balance) {
    return balance >= 1000000
      ? (balance / 1000000).toFixed(1) + 'M'
      : balance >= 1000
        ? (balance / 1000).toFixed(1) + 'K'
        : balance.toFixed(0);
  }

  stripeCharge(token) {
    var self = this;
    const { plan } = this.props.params;
    var amount = priceList[plan];
    fetch('/home/checkout', {
      method: 'POST',
      mode: 'cors',
      headers: {
        Authorization: 'Basic',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'stripeToken=' + token + '&amount=' + amount,
    }).then(function(response) {
      response.json().then(function(json) {
        if (json.status === 'succeeded') {
          var vitoken = vitokenList[plan];
          self.createTransaction(vitoken, function(err) {
            if (err) {
              self.setState({
                error: 'fail to create transactions',
                btnDisabled: false,
              });
              return;
            } else {
              var query = window.location.search;
              if (query && query.indexOf('sceneId') !== -1) {
                var params = query.split('=');
                self.openRoute('/station/' + params[1] + '/builder');
              } else self.openRoute('/home/balance');
            }
          });
        } else {
          self.setState({ error: json.message });
        }
      });
    });
  }

  createTransaction(value, cb) {
    var self = this;
    var userCookie = cookie.load('user');
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
        '&type=buying funds&description=buying Vitokens' +
        self.showBalance(Number(value)) +
        '&amount=' +
        Number(value).toFixed(2),
    }).then(function(response) {
      response.json().then(function(result) {
        if (result) {
          cb(null);
        } else cb(true);
      });
    });
  }

  render() {
    const errorMsg = this.state.error;
    return (
      <div className={styles.container}>
        <UIAppBar
          titleText="Pay With Card"
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
          <div className={styles.title}> Pay With Card</div>
          <div className={styles.error}>{errorMsg}</div>
          <div className={styles.row}>
            <label className={styles.label}>Name on Card</label>
            <div className={styles.field}>
              <TextField
                ref="cardName"
                hintText="Card Holder's Name"
                fullWidth={true}
              />
            </div>
          </div>
          <div className={styles.row}>
            <label className={styles.label}>Card Number</label>
            <div className={styles.field}>
              <TextField
                ref="cardNumber"
                hintText="Debit/Credit Card Number"
                fullWidth={true}
              />
            </div>
          </div>
          <div className={styles.row}>
            <label className={styles.label}>Expiration Date</label>
            <div className={styles.date}>
              <div>
                <select ref="month" className={styles.option}>
                  <option>Month</option>
                  <option value="01">Jan (01)</option>
                  <option value="02">Feb (02)</option>
                  <option value="03">Mar (03)</option>
                  <option value="04">Apr (04)</option>
                  <option value="05">May (05)</option>
                  <option value="06">June (06)</option>
                  <option value="07">July (07)</option>
                  <option value="08">Aug (08)</option>
                  <option value="09">Sep (09)</option>
                  <option value="10">Oct (10)</option>
                  <option value="11">Nov (11)</option>
                  <option value="12">Dec (12)</option>
                </select>
              </div>
              <div style={{ marginLeft: '15%' }}>
                <select ref="year" className={styles.option}>
                  <option>Year</option>
                  <option value="17">2017</option>
                  <option value="18">2018</option>
                  <option value="19">2019</option>
                  <option value="20">2020</option>
                  <option value="21">2021</option>
                  <option value="22">2022</option>
                  <option value="23">2023</option>
                </select>
              </div>
            </div>
          </div>
          <div className={styles.row}>
            <label className={styles.label}>Card CVV</label>
            <div className={styles.field}>
              <TextField
                ref="cardCVV"
                hintText="Security Code"
                fullWidth={true}
              />
            </div>
          </div>
          <div className={styles.submit}>
            <RaisedButton
              className={styles.button}
              disabled={this.state.btnDisabled}
              onTouchTap={this.handleSubmit}
              primary={true}
              label="Pay Now"
            />
          </div>

          <div className={styles.submit}>
            <RaisedButton
              className={styles.vitbutton}
              disabled={this.state.btnDisabled}
              onTouchTap={this.handleVitPayment}
              primary={true}
              label="Pay With VITOKENS"
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
