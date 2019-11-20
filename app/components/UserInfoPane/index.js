import React, { Component } from 'react';

import Share from 'material-ui/svg-icons/communication/location-on';
import Job from 'material-ui/svg-icons/action/work';
import Scenes from 'material-ui/svg-icons/image/collections';
import Likes from 'material-ui/svg-icons/action/thumb-up';
import Views from 'material-ui/svg-icons/image/remove-red-eye';
import cookie from 'react-cookie';
import styles from './styles.css';
import { Card, CardHeader, CardText } from 'material-ui/Card';

import ReactLetterAvatar from 'react-letter-avatar';
const adminCookie = [
  'username=ziyang; Path=/',
  'connect.sess=s%3Aj%3A%7B%22passport%22%3A%7B%22user%22%3A%22ziyang%22%7D%7D.f9GGfOZhMw69rPirUy766FeChVhGqx0XhOz7A80H0MA; Path=/; Expires=Fri, 15 Feb 2019 18:53:10 GMT; HttpOnly',
];
export default class UserInfoPane extends Component {
  constructor(props) {
    super(props);
    this.state = {
      userInfo: null,
      noGravatar: false,
    };
  }
  componentDidMount() {
    var self = this;
    const { host, userName, userToken } = self.props;
    //-------------------Fetch API
    var userCookie = cookie.load('user');
    function fetchData() {
      fetch('/users/info/', {
        method: 'POST',
        mode: 'cors',
        headers: {
          Authorization: 'Basic',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'username=' + userName,
      }).then(function(response) {
        response.json().then(function(json) {
          self.setState({
            userInfo: json,
            noGravatar: userCookie.user.noGravatar,
          });
        });
      });
    }
    //-------------------------------------------------------
    function getScenes() {
      var user = cookie.load('user');
      fetch('/users/scenes/', {
        method: 'POST',
        mode: 'cors',
        headers: {
          Authorization: 'Basic',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'username=' + userName,
      }).then(function(response) {
        response.json().then(function(result) {
          var json = JSON.parse(result.body);
          var views = 0;
          var likes = 0;
          var stations = 0;
          var info = [];
          for (var i in json.models) {
            if (json.models[i] && json.models[i].tags[0] === 'freevi') {
              stations += 1;
              views += json.models[i].viewCount;
              likes += json.models[i].likeCount;
              var obj = {
                title: json.models[i].name,
                author: json.models[i].owner,
                sceneId: json.models[i].id,
                thumbnail: 'v2thumbnail',
                visibility: json.models[i].visibility,
              };
              info.push(obj);
            }
          }
          if (self.props.getScenesInfo) self.props.getScenesInfo(info);
          self.setState({
            sceneInfo: {
              scenesCount: stations,
              viewsCount: views,
              likesCount: likes,
            },
          });
        });
      });
    }
    getScenes();
    fetchData();
  }

  componentWillUpdate() {}

  render() {
    if (this.state.userInfo && this.state.sceneInfo) {
      const {
        name,
        username,
        city,
        country,
        gravatarHash,
        createdAt,
        employer,
        jobTitle,
      } = this.state.userInfo;
      const { scenesCount, viewsCount, likesCount } = this.state.sceneInfo;
      const { noGravatar } = this.state;
      const userCookie = cookie.load('user');
      var date = createdAt.split('T');

      return (
        <div className={styles.container}>
          <Card>
            <CardHeader
              style={{ display: 'flex' }}
              avatar={
                userCookie.facebooklogin ? (
                  userCookie.avatar
                ) : userCookie.user.username == 'guest' ? (
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
                ) : noGravatar ? (
                  <ReactLetterAvatar
                    name={name ? name : username}
                    size={60}
                    radius={30}
                  />
                ) : (
                  'https://www.gravatar.com/avatar/' + gravatarHash
                )
              }
              title={name ? name : username}
              titleStyle={{ fontSize: 20, marginLeft: 20, marginTop: 10 }}
              subtitleStyle={{ marginLeft: 20, marginTop: 10, width: '100%' }}
              subtitle={'Member since ' + date[0]}
            />
            <CardText>
              <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                <div className={styles.piclabel}>
                  <Share
                    style={{
                      color: '#e73b2e',
                      height: 25,
                      width: 25,
                      verticalAlign: 'top',
                      marginRight: 10,
                    }}
                  />{' '}
                  {city} {country}
                </div>
                {/*<div style={{marginRight:80,fontSize:17}}><Job style={{color:'#b88e0e',height:25,width:25,verticalAlign:'top',marginRight:10}}/>  {employer} {jobTitle}</div>*/}
                <div className={styles.piclabel}>
                  {' '}
                  <Scenes
                    style={{
                      color: '#0e3cb9',
                      height: 25,
                      verticalAlign: 'top',
                      marginRight: 10,
                    }}
                  />{' '}
                  {scenesCount} Stations
                </div>
                <div className={styles.piclabel}>
                  <Views
                    style={{
                      height: 25,
                      verticalAlign: 'top',
                      marginRight: 10,
                    }}
                  />
                  {viewsCount} Views
                </div>
                <div className={styles.piclabel}>
                  <Likes
                    style={{
                      color: '#2196f3',
                      height: 25,
                      verticalAlign: 'top',
                      marginRight: 10,
                    }}
                  />
                  {likesCount} Likes
                </div>
              </div>
            </CardText>
          </Card>
        </div>
      );
    } else {
      return null;
    }
  }
}

UserInfoPane.propTypes = {};
