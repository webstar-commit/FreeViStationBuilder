import React, { Component } from 'react';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';
import TextField from 'material-ui/TextField';
import RaisedButton from 'material-ui/RaisedButton';
import UIAppBar from 'components/UIAppBar';
import Menu from 'material-ui/Menu';
import Dialog from 'material-ui/Dialog';
import moment from 'moment';
import ReactLetterAvatar from 'react-letter-avatar';
import Divider from 'material-ui/Divider';
import Avatar from 'material-ui/Avatar';
import FlatButton from 'material-ui/FlatButton';
import { Card, CardActions, CardText, CardHeader } from 'material-ui/Card';
import {
  Table,
  TableBody,
  TableHeader,
  TableHeaderColumn,
  TableRow,
  TableRowColumn,
} from 'material-ui/Table';
import UIUserDrawer from 'components/UIUserDrawer';
import cookie from 'react-cookie';
import styles from './styles.css';

export class BalancePage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      balance: '',
      dialogOpen: false,
      numOfTrans: 10,
      moreItem: true,
      error: null,
      openTransDetail: false,
      targetTran: null,
    };
    this.showMoreItem = this.showMoreItem.bind(this);
  }

  openRoute = route => {
    this.props.changeRoute(route);
  };

  openPlanPage = () => {
    this.openRoute('/home/Basic/checkout');
  };

  handleClose = () => {
    this.setState({ dialogOpen: false, openTransDetail: false });
  };

  showMoreItem(event) {
    var numOfTrans = this.state.numOfTrans;
    numOfTrans += 10;
    if (numOfTrans > this.state.trans.length) {
      numOfTrans = this.state.trans.length;
      this.setState({ numOfTrans: numOfTrans, moreItem: false });
    } else {
      this.setState({ numOfTrans: numOfTrans });
    }
  }
  showBalance(balance) {
    return balance >= 1000000
      ? (balance / 1000000).toFixed(1) + 'M'
      : balance >= 1000
        ? (balance / 1000).toFixed(1) + 'K'
        : balance.toFixed(0);
  }

  fetchData = function() {
    var self = this;
    var userCookie = cookie.load('user');
    var numOfTrans = this.state.numOfTrans;
    var moreItem = this.state.moreItem;
    fetch('/users/transactions', {
      method: 'POST',
      mode: 'cors',
      headers: {
        Authorization: 'Basic',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'method=GET&username=' + userCookie.user.username,
    }).then(function(response) {
      response.json().then(function(result) {
        const balance = result.balance;
        self.setState({
          trans: [],
          balance: balance,
          numOfTrans: 0,
          moreItem: false,
        });
      });
    });
  };

  componentWillMount() {
    this.fetchData();
  }
  openTransDetail(transaction) {
    this.setState({ openTransDetail: true, targetTran: transaction });
  }

  render() {
    var self = this;
    var userCookie = cookie.load('user');
    if (
      typeof userCookie === 'undefined' ||
      userCookie.user.username === 'guest'
    ) {
      this.openRoute('/');
      return null;
    }
    const actions = [];
    const actions1 = [
      <FlatButton
        label="Ok"
        primary={true}
        keyboardFocused={true}
        onTouchTap={this.handleClose}
      />,
    ];
    if (typeof this.state.trans === 'undefined') return null;
    const trans = this.state.trans.slice(0, this.state.numOfTrans);
    var target = '';
    if (this.state.targetTran) target = this.state.targetTran;
    return (
      <div className={styles.container}>
        <div className={styles.appBar}>
          <UIAppBar
            titleText={'My vit'}
            leftIcon={
              <div style={{ paddingLeft: 10 }}>
                {' '}
                <UIUserDrawer />{' '}
              </div>
            }
          />
        </div>
        <div className={styles.mainBlock}>
          <div>
            <Card style={{ backgroundColor: '#00bcd4' }}>
              <CardHeader
                style={{ width: '100%', textAlign: 'center', position: 'flex' }}
              />
              <CardText
                style={{ textAlign: 'center', color: 'white', fontSize: 30 }}
              >
                Vit Balance: {this.showBalance(this.state.balance)}
              </CardText>
              <CardActions style={{ textAlign: 'center' }}>
                <RaisedButton
                  style={{ marginTop: '5%' }}
                  labelColor={'#00bcd4'}
                  label="Add Vit"
                  onTouchTap={this.openPlanPage}
                />
              </CardActions>
            </Card>
            <h4 style={{ marginTop: '25px' }}>Lastest Transaction</h4>
            <Divider />
            <Table>
              <TableHeader displaySelectAll={false} adjustForCheckbox={false}>
                <TableRow>
                  <TableHeaderColumn>Type</TableHeaderColumn>
                  <TableHeaderColumn>Amount</TableHeaderColumn>
                  <TableHeaderColumn>Status</TableHeaderColumn>
                  <TableHeaderColumn>Time</TableHeaderColumn>
                </TableRow>
              </TableHeader>
              <TableBody displayRowCheckbox={false}>
                {trans.map(function(tran) {
                  return (
                    <TableRow key={tran._id}>
                      <TableRowColumn
                        className={styles.type}
                        onTouchTap={ev => {
                          self.openTransDetail(tran);
                        }}
                      >
                        {tran.type}
                      </TableRowColumn>
                      <TableRowColumn>
                        {' '}
                        {self.showBalance(Math.abs(tran.amount))}
                      </TableRowColumn>
                      <TableRowColumn>{tran.status}</TableRowColumn>
                      <TableRowColumn>
                        {moment(tran.createdAt).fromNow()}
                      </TableRowColumn>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {this.state.moreItem ? (
              <p
                onTouchTap={this.showMoreItem}
                style={{ marginTop: 20, color: '#0f6874' }}
                className={styles.moreItem}
              >
                {' '}
                Show more transactions{' '}
              </p>
            ) : null}
            <Dialog
              bodyClassName={styles.addTokens}
              title="Transaction Detail"
              actions={actions1}
              modal={false}
              open={this.state.openTransDetail}
              onRequestClose={this.handleClose}
            >
              <p> Type: {target.type} </p>
              <p> Status: {target.status} </p>
              <p> Description: {target.description} </p>
              <p> Amount: {self.showBalance(Math.abs(target.amount))} </p>
              <p> Date: {moment(target.createdAt).format('LLLL')} </p>
            </Dialog>
          </div>
        </div>
      </div>
    );
  }
}

BalancePage.propTypes = {
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
)(BalancePage);
