import React, { Component } from 'react';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';
import cookie from 'react-cookie';
import UIAppBar from 'components/UIAppBar';
import UIUserDrawer from 'components/UIUserDrawer';
import NavigationBack from 'material-ui/svg-icons/navigation/arrow-back';
import styles from './styles.css';
import Tab from 'material-ui/Tabs';
import IconButton from 'material-ui/IconButton';
import Checkbox from 'material-ui/Checkbox';
import Lock from 'material-ui/svg-icons/action/lock-outline';
import FlatButton from 'material-ui/FlatButton';
import Dialog from 'material-ui/Dialog';
import Accordion from 'components/Accordion';
import MyDialog from 'components/MyDialog';

const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
  navigator.userAgent
);
var data = [
  {
    title: 'Sofa',
    content: '4a7c547d-3964-4ea5-b258-8e8a9ef88a97',
  },
  {
    title: 'Table',
    content: '82351484-38ed-4428-8018-85b488b161e8',
  },
  {
    title: 'Bed',
    content: '0aefd5ed-fb6d-4f4d-8f9d-bd165ac5fe69',
  },
  {
    title: 'Cabinet',
    content: 'af04ec7b-33d6-45c6-aa2b-d15cb2d9e04c',
  },
  {
    title: 'Chair',
    content: '4796d348-7aea-4019-933d-640be83c146a',
  },
  {
    title: 'Other',
    content: '53187773-d1bf-4728-ab17-7d6606847e80',
  },
];
function navigationBackButton(func) {
  return (
    <IconButton onTouchTap={func}>
      <NavigationBack />
    </IconButton>
  );
}
export class SalePage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      collectionData: null,
      userCollection: null,
      targetScene: null,
      targetCollection: null,
      ownItem: false,
      data: null,
      buyError: false,
      inventory: false,
    };
    this.filterProduct = this.filterProduct.bind(this);
  }

  openRoute = route => {
    this.props.changeRoute(route);
  };

  openUserPage = () => {
    this.openRoute('/');
  };

  componentWillMount() {
    var self = this;
    var userCookie = cookie.load('user');

    var fetchTransactions = function(cb) {
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
          cb(results.balance);
        });
      });
    };
    fetchTransactions(function(balance) {
      self.setState({ balance: balance, data: data });
    });
  }

  PurchaseStation(sceneId) {
    var self = this;
    var userCookie = cookie.load('user');
    var collection = userCookie.user.collection;
    var purchase = function(id, collection, cb) {
      fetch('/users/transactions', {
        method: 'POST',
        mode: 'cors',
        headers: {
          Authorization: 'Basic ',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body:
          'method=POST&username=' +
          userCookie.user.username +
          '&collection=' +
          userCookie.user.collection +
          '&type=model purchases&description=model purchases+' +
          id +
          ' for $ 10.00' +
          '&amount=1000' +
          '&sceneId=' +
          id,
      }).then(function(response) {
        response.json().then(function(result) {
          if (result.status === 'success') {
            cb(null, result);
          } else {
            cb(true);
          }
        });
      });
    };
    purchase(sceneId, collection, function(err, resutl) {
      if (err) {
        self.setState({ buyError: true });
        return;
      }
      window.location.reload(true);
    });
  }

  showBalance(balance) {
    if (typeof balance === 'undefined' || balance === 0) return '0';
    return balance >= 1000000
      ? (balance / 1000000).toFixed(1) + 'M'
      : balance >= 1000
        ? (balance / 1000).toFixed(1) + 'K'
        : balance.toFixed(0);
  }

  filterProduct() {
    const checked = this.state.checked;
    this.setState({ checked: !checked });
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

    if (!this.state.data) return null;
    const buyErrorActions = [
      <FlatButton
        label="Purchase vit"
        primary={true}
        onTouchTap={ev => {
          window.location.assign('/home/balance');
        }}
      />,
      <FlatButton
        label="Back"
        onTouchTap={ev => {
          this.setState({ buyError: false });
        }}
      />,
    ];
    var balance = this.state.balance ? this.state.balance : 0;
    const myPurchase = this.state.checked;
    return (
      <div className={styles.container}>
        <div className={styles.appBar}>
          <UIAppBar
            titleText="Vimarket"
            leftIcon={
              <div style={{ paddingLeft: 10 }}>
                <UIUserDrawer />
              </div>
            }
          />
        </div>
        <Checkbox
          label="My Purchase"
          style={{ marginLeft: 100, marginTop: 50 }}
          onTouchTap={this.filterProduct}
        />
        <div className={styles.mainBlock}>
          <Accordion
            data={this.state.data}
            myPurchase={myPurchase}
            PurchaseStation={this.PurchaseStation.bind(this)}
          />
        </div>
        <div className={styles.ViTokens}>
          <p> vit: {this.showBalance(this.state.balance)} </p>
        </div>
        <MyDialog
          message={'Not enough vitokens'}
          dialogOpen={this.state.buyError}
          actions={buyErrorActions}
          handleClose={ev => {
            this.setState({ buyError: false });
          }}
        />
      </div>
    );
  }
}

SalePage.propTypes = {
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
)(SalePage);
