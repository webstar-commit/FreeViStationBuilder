import React, { Component } from 'react';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';
import UIAppBar from 'components/UIAppBar';
import Divider from 'material-ui/Divider';
import UIUserDrawer from 'components/UIUserDrawer';
import cookie from 'react-cookie';
import styles from './styles.css';
import moment from 'moment';
import { Card, CardHeader } from 'material-ui/Card';

export class NotificationsPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      notifications: null,
      numOfNotifications: 10,
      moreItem: true,
    };
    this.showMoreItem = this.showMoreItem.bind(this);
  }

  openRoute = route => {
    this.props.changeRoute(route);
  };

  openScenePage = notification => {
    this.readNotification(notification);
    this.openRoute('/station/' + notification.sceneId);
  };

  handleDialogClose(event) {
    this.setState({ dialogOpen: false });
  }

  showMoreItem(event) {
    var numOfNotifications = this.state.numOfNotifications;
    numOfNotifications += 10;
    if (numOfNotifications > this.state.notifications.length) {
      numOfNotifications = this.state.notifications.length;
      this.setState({
        numOfNotifications: numOfNotifications,
        moreItem: false,
      });
    } else {
      this.setState({ numOfNotifications: numOfNotifications });
    }
  }

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
          models[i].read =
            moment(models[i].readAt) > moment(models[i].createdAt);
        }
        if (models.length > self.state.numOfNotifications) {
          self.setState({ notifications: models });
        } else {
          self.setState({
            notifications: models,
            numOfNotifications: models.length,
            moreItem: false,
          });
        }
      });
    });
  }
  render() {
    var userCookie = cookie.load('user');
    if (!this.state.notifications) return null;
    const notifications = this.state.notifications.slice(
      0,
      this.state.numOfNotifications
    );
    const moreItem = this.state.moreItem;
    if (
      typeof userCookie === 'undefined' ||
      userCookie.user.username === 'guest'
    ) {
      this.openRoute('/');
      return null;
    }
    return (
      <div className={styles.container}>
        <div className={styles.appBar}>
          <UIAppBar
            titleText={'Notifications'}
            leftIcon={
              <div style={{ paddingLeft: '10px' }}>
                <UIUserDrawer />
              </div>
            }
          />
        </div>
        <div className={styles.mainBlock}>
          <div className={styles.title}>
            <h2>Notifications</h2>
          </div>
          <Divider style={{ margin: 10 }} />
          <div className={styles.notifications}>
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
            {moreItem ? (
              <p
                onTouchTap={this.showMoreItem}
                style={{ color: '#0f6874' }}
                className={styles.moreItem}
              >
                {' '}
                Show more notifications
              </p>
            ) : null}
          </div>
        </div>
      </div>
    );
  }
}

NotificationsPage.propTypes = {
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
)(NotificationsPage);
