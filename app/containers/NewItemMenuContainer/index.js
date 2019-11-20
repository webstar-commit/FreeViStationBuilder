import React, { Component } from 'react';
import cookie from 'react-cookie';
import NewItemMenu from 'components/NewItemMenu';
import Accordion from 'components/Accordion';
import UIAppBar from 'components/UIAppBar';
import Purchase from 'material-ui/svg-icons/action/shopping-cart';
import FlatButton from 'material-ui/FlatButton';
import IconButton from 'material-ui/IconButton';
import CircularProgress from 'material-ui/CircularProgress';
import Dialog from 'material-ui/Dialog';
import MyDialog from 'components/MyDialog';
const data = [
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
export default class NewItemMenuContainer extends Component {
  constructor(props) {
    super(props);
    this.state = {
      targetScene: null,
      targetCollection: null,
      noVitokensOpen: false,
      waitForBuy: false,
    };
    this.PurchaseStation = this.PurchaseStation.bind(this);
  }

  PurchaseStation(sceneId, collection) {
    var self = this;
    const publicEditor = this.props.public;
    this.setState({ waitForBuy: true });
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
          if (result || publicEditor) {
            self.props.addNewItem(sceneId);
            self.props.actions();
            self.props.buyItem(1000);
            userCookie.user = result.value;
            cookie.save('user', userCookie, { path: '/' });
            self.setState({ waitForBuy: false });
          } else {
            self.setState({ noVitokensOpen: true, waitForBuy: false });
          }
        });
      });
    };
    purchase(sceneId, collection);
  }

  render() {
    const sceneId = this.props.sceneId;
    const noVitokensActions = [
      <FlatButton
        label="Purchase vit"
        primary={true}
        onTouchTap={ev => {
          window.location.assign('/home/plan?sceneId=' + sceneId);
        }}
      />,
      <FlatButton
        label="Back"
        onTouchTap={ev => {
          this.setState({ noVitokensOpen: false });
        }}
      />,
    ];
    const width = window.innerWidth > 0 ? window.innerWidth : screen.width;
    const height = window.innerHeight > 0 ? window.innerHeight : screen.height;
    const floatWidth = 0.5 * width;
    const floatHeight = 0.8 * height;
    return (
      <div style={{ position: 'relative', top: 0, height: floatHeight }}>
        <div style={{ width: '100%', top: 0 }}>
          <UIAppBar
            titleText="Freevi Store"
            leftIcon={
              <div>
                <IconButton
                  style={{ cursor: 'default' }}
                  iconStyle={{ color: 'white' }}
                >
                  <Purchase />
                </IconButton>
              </div>
            }
          />
        </div>
        <Accordion
          data={data}
          buyItem={this.props.buyItem}
          addNewItem={this.props.addNewItem}
          actions={this.props.actions}
          PurchaseStation={this.PurchaseStation}
          edit={true}
        />
        <MyDialog
          message={'You do not have enougth vit'}
          actions={noVitokensActions}
          dialogOpen={this.state.noVitokensOpen}
          handleClose={ev => {
            this.setState({ noVitokensOpen: false });
          }}
        />
        <Dialog style={{ zIndex: 214748364 }} open={this.state.waitForBuy}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              height: '100%',
            }}
          >
            <CircularProgress size={80} thickness={7} />
            <h3>Processing</h3>
          </div>
        </Dialog>
      </div>
    );
  }
}

NewItemMenuContainer.propTypes = {
  actions: React.PropTypes.func,
  import: React.PropTypes.func,
  addNewItem: React.PropTypes.func,
};
