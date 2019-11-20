import NavigationMenu from 'material-ui/svg-icons/navigation/menu';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';
import cookie from 'react-cookie';
import Drawer from 'material-ui/Drawer';
import IconButton from 'material-ui/IconButton';
import MenuItem from 'material-ui/MenuItem';
import FlatButton from 'material-ui/FlatButton';
import ActionHome from 'material-ui/svg-icons/action/home';
import WorldView from 'material-ui/svg-icons/maps/my-location';
import EmailIcon from 'material-ui/svg-icons/communication/email';
import Setting from 'material-ui/svg-icons/action/settings';
import Password from 'material-ui/svg-icons/action/lock';
import Purchase from 'material-ui/svg-icons/action/shopping-cart';
import Balance from 'material-ui/svg-icons/action/credit-card';
import Quit from 'material-ui/svg-icons/action/power-settings-new';
import Notification from 'material-ui/svg-icons/social/notifications';
import Divider from 'material-ui/Divider';
import ReactLetterAvatar from 'react-letter-avatar';
import { Card, CardHeader, CardText } from 'material-ui/Card';

export class UIUserDrawer extends Component {
  constructor(props) {
    super(props);
    this.state = {
      leftPaneOpen: false,
      name: '',
      username: '',
      gravatarHash: null,
      noGravatar: false,
    };
    this.handleToggle = this.handleToggle.bind(this);
  }

  openRoute = route => {
    const reload =
      /A6100/.test(navigator.userAgent) ||
      window.location.pathname.indexOf('/user/world') !== -1;
    if (reload) window.location.assign(route);
    else this.props.changeRoute(route);
  };
  openPasswordPage = () => {
    this.setState({ leftPaneOpen: false });
    var userCookie = cookie.load('user');
    if (userCookie.guestlogin) this.openRoute('/');
    else this.openRoute('/home/settings/password');
  };
  openEmailPage = () => {
    var userCookie = cookie.load('user');
    if (userCookie.guestlogin) this.openRoute('/');
    else this.openRoute('/home/settings/email');
  };
  openInventoryPage = () => {
    var userCookie = cookie.load('user');
    if (userCookie.guestlogin) this.openRoute('/');
    else this.openRoute('/home/inventory');
  };
  openUserPage = ev => {
    const userCookie = cookie.load('user');
    if (userCookie.guestlogin) this.openRoute('/');
    else {
      this.setState({ leftPaneOpen: false });
      window.location.assign('/user/' + userCookie.user.username);
    }
  };
  openWorldViewPage = () => {
    this.setState({ leftPaneOpen: false });
    const userCookie = cookie.load('user');
    if (userCookie.guestlogin) this.openRoute('/');
    else this.openRoute('/user/world/' + userCookie.user.username);
  };
  openNotificationPage = () => {
    this.setState({ leftPaneOpen: false });
    var userCookie = cookie.load('user');
    if (userCookie.guestlogin) this.openRoute('/');
    else this.openRoute('/home/notifications');
  };
  openBalancePage = () => {
    this.setState({ leftPaneOpen: false });
    var userCookie = cookie.load('user');
    if (userCookie.guestlogin) this.openRoute('/');
    else this.openRoute('/home/balance');
  };
  openPurchasePage = () => {
    this.setState({ leftPaneOpen: false });
    var userCookie = cookie.load('user');
    if (userCookie.guestlogin) this.openRoute('/');
    else this.openRoute('/store');
  };
  handleToggle(event) {
    const user = cookie.load('user');
    if (typeof user === 'undefined') {
      return;
    }
    this.setState({ leftPaneOpen: true });
  }

  SignOut(event) {
    cookie.remove('user', { path: '/' });
    this.openRoute('/');
  }
  componentDidMount() {
    const userCookie = cookie.load('user');
    this.setState({
      name: userCookie.user.name,
      facebooklogin: userCookie.facebooklogin,
      avatar: userCookie.avatar,
      username: userCookie.user.username,
      noGravatar: userCookie.user.noGravatar,
      gravatarHash: userCookie.user.gravatarHash,
    });
  }
  render() {
    return (
      <div>
        <FlatButton
          onTouchTap={this.handleToggle}
          style={{ marginTop: 5, color: 'white', minWidth: 38 }}
          icon={<NavigationMenu />}
        />
        <Drawer
          docked={false}
          width={300}
          open={this.state.leftPaneOpen}
          onRequestChange={open => this.setState({ leftPaneOpen: open })}
        >
          <Card>
            <CardHeader
              avatar={
                this.state.facebooklogin ? (
                  this.state.avatar
                ) : this.state.username == 'guest' ? (
                  <img
                    src="/images/guest.png"
                    width="90px"
                    height="90px"
                    style={{
                      color: 'white',
                      cursor: 'pointer',
                      backgroundColor: 'rgb(188,188,188)',
                      borderRadius: '50%',
                      cursor: 'pointer',
                    }}
                  />
                ) : this.state.noGravatar ? (
                  <ReactLetterAvatar
                    name={
                      this.state.name ? this.state.name : this.state.username
                    }
                    size={60}
                    radius={30}
                  />
                ) : (
                  'https://www.gravatar.com/avatar/' + this.state.gravatarHash
                )
              }
              titleStyle={{
                marginTop: 20,
                marginLeft: 10,
                marginBottom: 10,
                fontSize: '18px',
              }}
              title={this.state.name ? this.state.name : this.state.username}
            />
          </Card>
          <MenuItem
            primaryText="ViMarket Nation"
            leftIcon={<WorldView />}
            onTouchTap={this.openWorldViewPage}
          /> 
          <MenuItem
            primaryText="My Stations"
            leftIcon={<ActionHome />}
            onTouchTap={ev => {
              this.openUserPage();
            }}
          />
          <Divider style={{ marginTop: '10px', marginBottom: '10px' }} />
          {/*<MenuItem primaryText="Notifications" leftIcon={<Notification/>}onTouchTap={this.openNotificationPage}/>*/}
          <MenuItem
            primaryText="Vimarket"
            leftIcon={<Purchase />}
            onTouchTap={this.openPurchasePage}
          />
          {/*<MenuItem primaryText="My Inventory" leftIcon={<Purchase/>} onTouchTap={this.openInventoryPage}/>*/}
          <Divider style={{ marginTop: '10px', marginBottom: '10px' }} />
          <MenuItem
            primaryText="My Vit"
            leftIcon={<Balance />}
            onTouchTap={this.openBalancePage}
          />
          <MenuItem
            primaryText="My Password"
            leftIcon={<Password />}
            onTouchTap={this.openPasswordPage}
          />
          <MenuItem
            primaryText="My Settings"
            leftIcon={<EmailIcon />}
            onTouchTap={this.openEmailPage}
          />
          <Divider style={{ marginTop: '10px', marginBottom: '10px' }} />
          <MenuItem
            primaryText="Sign out"
            leftIcon={<Quit />}
            onTouchTap={ev => {
              this.handleClose;
              this.SignOut();
            }}
          />
        </Drawer>
      </div>
    );
  }
}

UIUserDrawer.propTypes = {
  changeRoute: React.PropTypes.func,
};
function mapDispatchToProps(dispatch) {
  return {
    changeRoute: url => dispatch(push(url)),
  };
}

export default connect(null, mapDispatchToProps)(UIUserDrawer);
