import React, { Component } from 'react';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';
import cookie from 'react-cookie';
import Notification from 'material-ui/svg-icons/social/notifications';
import Divider from 'material-ui/Divider';
import Badge from 'material-ui/Badge';
import moment from 'moment';
import Popover from 'material-ui/Popover';
import IconButton from 'material-ui/IconButton';
import Create from 'material-ui/svg-icons/content/add-circle';
import styles from './styles.css';
import { Card, CardHeader } from 'material-ui/Card';
export class Notifications extends Component {
  constructor(props) {
    super(props);
    this.state = {
      open: false,
      notifications: null,
      unread: null,
    };
  }

  openRoute = route => {
    this.props.changeRoute(route);
  };

  openScenePage = notification => {
    this.readNotification(notification);
    this.openRoute('/station/' + notification.sceneId);
  };

  openNewStationPage = () => {
    this.openRoute('/templates');
  };
  openNotifications = event => {
    this.setState({
      open: true,
      anchorEl: event.currentTarget,
    });
  };
  openNoficationPage = () => {
    this.openRoute('/home/notifications');
  };

  handleRequestClose = event => {
    this.setState({ open: false });
  };

  readNotification(notification) {
    var userCookie = cookie.load('user');
    fetch('/users/notifications', {
      method: 'POST',
      mode: 'cors',
      headers: {
        Authorization: 'Basic',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body:
        'username=' +
        userCookie.user.username +
        '&method=PUT&notificationId=' +
        notification._id,
    }).then(function(response) {});
  }

  componentDidMount() {
    var self = this;
    var userCookie = cookie.load('user');
    fetch('/users/notifications', {
      method: 'POST',
      mode: 'cors',
      headers: {
        Authorization: 'Basic',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'method=GET&username=' + userCookie.user.username,
    }).then(function(response) {
      response.json().then(function(result) {
        var models = result.models;
        var unread = 0;
        for (var i in models) {
          if (models[i].sourceType === 'like') {
            models[i].message =
              models[i].sourceUsername + ' likes your station';
          } else if (models[i].sourceType === 'newComment') {
            models[i].message =
              models[i].sourceUsername + ' makes a new comment on your station';
          } else {
            models[i].message =
              models[i].sourceUsername + ' mentions you in his comment';
          }
          models[i].createFromNow = moment(models[i].createdAt).fromNow();
          if (moment(models[i].readAt) < moment(models[i].createdAt)) {
            models[i].read = false;
            unread += 1;
          } else models[i].read = true;
        }
        self.setState({ notifications: models.slice(0, 8), unread: unread });
      });
    });
  }

  render() {
    if (!this.state.notifications) return null;
    const notifications = this.state.notifications;
    const unread = this.state.unread;
    return (
      <div>
        {unread === 0 ? (
          <IconButton
            tooltip="Notifications"
            onTouchTap={this.openNotifications}
            iconStyle={{ color: 'white', paddintTop: 0 }}
          >
            <Notification />
          </IconButton>
        ) : (
          <Badge
            badgeContent={this.state.unread}
            secondary={true}
            style={{ padding: 0, marginRight: 20 }}
            badgeStyle={{ top: 0, right: 0 }}
          >
            <IconButton
              tooltip="Notifications"
              onTouchTap={this.openNotifications}
              iconStyle={{ color: 'white', paddintTop: 0 }}
            >
              <Notification />
            </IconButton>
          </Badge>
        )}
        <IconButton
          tooltip="New Station"
          onTouchTap={this.openNewStationPage}
          iconStyle={{ color: 'white', paddintTop: 0, marginRight: 20 }}
        >
          <Create />
        </IconButton>
        <Popover
          open={this.state.open}
          anchorEl={this.state.anchorEl}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          targetOrigin={{ horizontal: 'right', vertical: 'top' }}
          onRequestClose={this.handleRequestClose}
        >
          <div style={{ margin: '5px' }}>
            <span>Notifications</span>
          </div>
          <Divider style={{ marginBottom: '5px' }} />
          {notifications.map(notification => {
            if (notification.read) {
              return (
                <Card
                  key={notification._id}
                  onTouchTap={ev => this.openScenePage(notification)}
                  className={styles.read}
                >
                  <CardHeader
                    avatar={'https://clara.io/img/default_avatar.png'}
                    title={notification.message}
                    subtitle={notification.createFromNow}
                  />
                </Card>
              );
            } else {
              return (
                <Card
                  key={notification._id}
                  onTouchTap={ev => this.openScenePage(notification)}
                  style={{ backgroundColor: '#b9b9b9' }}
                  className={styles.unread}
                >
                  <CardHeader
                    avatar={'https://clara.io/img/default_avatar.png'}
                    title={notification.message}
                    subtitle={notification.createFromNow}
                  />
                </Card>
              );
            }
          })}
          <Divider />
          <p onTouchTap={this.openNoficationPage} className={styles.link}>
            {' '}
            All notifications{' '}
          </p>
        </Popover>
      </div>
    );
  }
}

Notifications.propTypes = {
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
)(Notifications);
