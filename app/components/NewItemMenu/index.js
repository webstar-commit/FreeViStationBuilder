import React, { Component } from 'react';
import cookie from 'react-cookie';
import IconButton from 'material-ui/IconButton';
import { Tabs, Tab } from 'material-ui/Tabs';
import { GridList, GridTile } from 'material-ui/GridList';
import Close from 'material-ui/svg-icons/navigation/close';
import Dialog from 'material-ui/Dialog';
import MyDialog from 'components/MyDialog';
import FlatButton from 'material-ui/FlatButton';
export default class NewItemMenu extends Component {
  constructor(prop) {
    super(prop);
    this.state = {
      newItem: null,
      viewDialogOpen: false,
      noVitokensOpen: false,
      targetScene: null,
      targetCollection: null,
    };
  }

  renderMenu(collection) {
    var self = this;
    var items = [];
    var ids = collection.ids;
    var access = collection.access;
    ids.map(function(id) {
      items.push(
        access[ids.indexOf(id)] ? (
          <GridTile
            key={id}
            title={'owned'}
            onTouchTap={ev => {
              self.props.addNewItem(id, access[ids.indexOf(id)]);
              self.props.actions();
            }}
          >
            <img
              src={
                'https://clara.io/api/scenes/' + id + '/v2thumbail?width=400'
              }
              role="presentation"
            />
          </GridTile>
        ) : (
          <GridTile
            key={id}
            title={'VIT: ' + self.showBalance(1000)}
            onTouchTap={ev => {
              self.viewItem(id, collection);
            }}
          >
            <img
              src={
                'https://clara.io/api/scenes/' + id + '/v2thumbnail?width=400'
              }
              role="presentation"
            />
          </GridTile>
        )
      );
    });
    return (
      <GridList
        cellHeight={150}
        cols={2}
        style={{ height: 300, overflowY: 'scroll' }}
      >
        {items}
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

  viewItem(sceneId, collection) {
    this.setState({
      viewDialogOpen: true,
      targetScene: sceneId,
      targetCollection: collection,
      uiPlusOpen: false,
    });
  }

  PurchaseStation(sceneId, collection) {
    var self = this;
    var userCookie = cookie.load('user');
    var purchase = function(id, collection) {
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
          ' for $ 1000' +
          '&amount=1000&sceneId=' +
          id,
      }).then(function(response) {
        response.json().then(function(result) {
          if (result.status) {
            self.props.addNewItem(sceneId);
            self.props.actions();
            self.props.buyItem(1000);
          } else {
            self.setState({ viewDialogOpen: false, noVitokensOpen: true });
          }
        });
      });
    };
    purchase(sceneId, collection);
  }
  renderTabs() {
    var tabs = [];
    if (this.props.collectionData) {
      this.props.collectionData.map(collection =>
        tabs.push(
          <Tab label={collection.name} key={collection.collectionId}>
            {this.renderMenu(collection)}
          </Tab>
        )
      );
    }
    return <Tabs>{tabs}</Tabs>;
  }
  render() {
    const { actions } = this.props;
    const { colData } = this.props;
    const viewActions = [
      <FlatButton
        label="Back"
        onTouchTap={ev => {
          this.setState({ viewDialogOpen: false });
        }}
      />,
      <FlatButton
        label="Purchase"
        primary={true}
        onTouchTap={ev => {
          this.PurchaseStation(
            this.state.targetScene,
            this.state.targetCollection
          );
        }}
      />,
    ];
    const noVitokensActions = [
      <FlatButton
        label="Purchase Vitokens"
        primary={true}
        onTouchTap={ev => {
          window.location.assign('/home/balance');
        }}
      />,
      <FlatButton
        label="Back"
        onTouchTap={ev => {
          this.setState({ noVitokensOpen: false });
        }}
      />,
    ];
    return (
      <div>
        <div style={{ height: '100%', width: '100%' }}>
          <table style={{ width: '100%' }}>
            <tbody>
              <tr>
                <td style={{ width: '5%' }} />
                <td style={{ width: '45%' }}>
                  <div
                    style={{
                      left: '100px)',
                      fontSize: 20,
                      fontFamily: 'sans-serif',
                    }}
                  >
                    New Item
                  </div>
                </td>
                <td style={{ width: '50%' }}>
                  <IconButton
                    onTouchTap={actions}
                    style={{ left: 'calc(100% - 45px)' }}
                  >
                    <Close />
                  </IconButton>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        {this.renderTabs()}
        <Dialog
          modal={false}
          open={this.state.viewDialogOpen}
          actions={viewActions}
          style={{ zIndex: 21474836 }}
          handleClose={ev => {
            this.setState({ viewDialogOpen: false });
          }}
        >
          <img
            src={'https://clara.io/api/scenes/' + this.state.targetScene + '/'}
            style={{ width: '100%', height: '100%' }}
          />
          <p> Vitoken: 1.0K </p>
        </Dialog>
        <MyDialog
          message={'You do not have enougth Vitokens'}
          actions={noVitokensActions}
          dialogOpen={this.state.noVitokensOpen}
          handleClose={ev => {
            this.setState({ noVitokensOpen: false });
          }}
        />
      </div>
    );
  }
}

NewItemMenu.propTypes = {
  actions: React.PropTypes.func,
  collectionData: React.PropTypes.array,
};
