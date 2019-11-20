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
import { GridList, GridTile } from 'material-ui/GridList';
import Lock from 'material-ui/svg-icons/action/lock-outline';
import FlatButton from 'material-ui/FlatButton';
import Dialog from 'material-ui/Dialog';
import MyDialog from 'components/MyDialog';

const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
  navigator.userAgent
);
var data = [
  {
    title: 'Sofa',
    content: 'd33fb412-ebb3-4fdc-8668-3a85a14cf47c',
  },
  {
    title: 'Table',
    content: '9060cd73-4323-4092-904b-9484219aa094',
  },
  {
    title: 'Bed',
    content: '8d5b6775-5958-49df-8abe-53c4da08dad1',
  },
  {
    title: 'Cabinet',
    content: '74c20904-3b6f-4484-8dea-49453807e00c',
  },
  {
    title: 'Chair',
    content: '597f70fd-f826-48f5-a57a-b18e001f0f09',
  },
];
function navigationBackButton(func) {
  return (
    <IconButton onTouchTap={func}>
      <NavigationBack />
    </IconButton>
  );
}
export class InventoryPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      collectionData: null,
      userCollection: null,
      dialogOpen: false,
      viewDialogOpen: false,
      targetScene: null,
      targetCollection: null,
      ownItem: false,
      data: null,
      inventory: false,
    };
  }

  openRoute = route => {
    this.props.changeRoute(route);
  };

  viewItem(sceneId) {
    this.setState({ viewDialogOpen: true, targetScene: sceneId });
  }

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
          var balance = 0;
          results.forEach(function(result) {
            if (result.status === 'success') {
              balance += result.amount;
            }
          });
          cb(balance);
        });
      });
    };
    fetchTransactions(function(balance) {
      self.fetchInventory(function(json) {
        var info = [];
        for (var i = 0; i < json.models.length; i++) {
          var obj = {
            title: json.models[i].name,
            author: json.models[i].owner,
            sceneId: json.models[i].id,
          };
          info.push(obj);
        }
        self.setState({ balance: balance, sceneInfo: info });
      });
    });
  }
  fetchInventory(cb) {
    var userCookie = cookie.load('user');
    fetch('/stations/collection', {
      method: 'POST',
      mode: 'cors',
      headers: {
        Authorization: 'Basic',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'collection=' + userCookie.user.collection,
    }).then(function(response) {
      response.json().then(function(json) {
        var sceneInfo = JSON.parse(json.body);
        cb(sceneInfo);
      });
    });
  }
  renderGrid() {
    var self = this;
    const tilesData = this.state.sceneInfo;
    var col = mobile ? 1 : 4;
    return (
      <GridList cellHeight={'auto'} cols={col} className={styles.gridList}>
        {tilesData.map(tile => {
          const imgSrc =
            'https://clara.io/api/scenes/' + tile.sceneId + '/thumbnail.jpg';
          return (
            <GridTile
              className={styles.gridTile}
              title={tile.title}
              key={tile.sceneId}
              onTouchTap={ev => {
                self.viewItem(tile.sceneId);
              }}
            >
              <img
                src={imgSrc}
                style={{ width: '100%', height: '100%' }}
                role="presentation"
              />
            </GridTile>
          );
        })}
      </GridList>
    );
  }
  showBalance(balance) {
    if (typeof balance === 'undefined' || balance === 0) return '0';
    return balance >= 1000000
      ? (balance / 1000000).toFixed(1) + 'M'
      : balance >= 1000
        ? (balance / 1000).toFixed(1) + 'K'
        : balance.toFixed(0);
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
    if (!this.state.sceneInfo) return null;
    const viewActions = [
      <FlatButton
        label="Back"
        onTouchTap={ev => {
          this.setState({ viewDialogOpen: false });
        }}
      />,
    ];
    var balance = this.state.balance ? this.state.balance : 0;
    return (
      <div className={styles.container}>
        <div className={styles.appBar}>
          <UIAppBar titleText="My inventory" leftIcon={<UIUserDrawer />} />
        </div>
        <div className={styles.mainBlock}>{this.renderGrid()}</div>
        <div className={styles.ViTokens}>
          <p> vit: {this.showBalance(this.state.balance)} </p>
        </div>
        <MyDialog
          message={'Not enough vitokens'}
          dialogOpen={this.state.dialogOpen}
          handleClose={ev => this.handleDialogClose()}
        />
        <Dialog
          className={styles.Dialog}
          modal={false}
          open={this.state.viewDialogOpen}
          actions={viewActions}
        >
          <iframe
            src={
              'https://clara.io/player/v2/' +
              this.state.targetScene +
              '?tools=hide'
            }
            className={styles.Product}
          />
        </Dialog>
      </div>
    );
  }
}

InventoryPage.propTypes = {
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
)(InventoryPage);
