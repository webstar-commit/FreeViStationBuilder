import React, { Component } from 'react';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';
import TextField from 'material-ui/TextField';
import UIAppBar from 'components/UIAppBar';
import IconButton from 'material-ui/IconButton';
import NavigationBack from 'material-ui/svg-icons/navigation/arrow-back';
import cookie from 'react-cookie';
import styles from './styles.css';
import Divider from 'material-ui/Divider';
import RaisedButton from 'material-ui/RaisedButton';
import Checkbox from 'material-ui/Checkbox';
import Paper from 'material-ui/Paper';

function navigationBackButton(func) {
  return (
    <IconButton onClick={func}>
      <NavigationBack />
    </IconButton>
  );
}

export class SettingPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      name: '',
      load: null,
      description: '',
      access: 'Gallery',
      nameError: '',
      geolocation: null,
    };
    this.geoMarker = null;
    this.handleNameChange = this.handleNameChange.bind(this);
    this.handleDescriptionChange = this.handleDescriptionChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  openRoute = route => {
    this.props.changeRoute(route);
  };

  openUserPage = () => {
    var json = cookie.load('user');
    this.openRoute('/user/' + json.user.username);
  };

  handleNameChange(event) {
    if (this.state.nameError !== '') {
      this.setState({ nameError: '', name: event.target.value });
      return;
    }
    this.setState({ name: event.target.value });
  }

  handleDescriptionChange(event) {
    this.setState({ description: event.target.value });
  }

  getSceneInfo(body, cb) {
    var userCookie = cookie.load('user');
    fetch('/stations/info', {
      method: 'POST',
      mode: 'cors',
      headers: {
        Authorization: 'Basic',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body,
    }).then(function(response) {
      response.json().then(function(json) {
        cb(json);
      });
    });
  }
  componentWillMount() {
    var self = this;
    const { sceneId } = this.props.params;
    var body = 'method=GET&sceneId=' + sceneId;
    this.getSceneInfo(body, function(json) {
      var sceneInfo = JSON.parse(json.body);
      self.setState({
        name: sceneInfo.name,
        description: sceneInfo.description,
        geolocation: sceneInfo.geoloc,
        load: true,
      });
    });
  }

  handleSubmit(event) {
    var json = cookie.load('user');
    const { sceneId } = this.props.params;
    var name = this.state.name;
    var description = this.state.description;
    var self = this;
    var longitude, latitude;
    if (document.getElementById('selectLoc').checked) {
      longitude = this.geoMarker.position.lng();
      latitude = this.geoMarker.position.lat();
    } else {
      longitude = this.state.geolocation[0];
      latitude = this.state.geolocation[1];
    }
    var body =
      'method=PUT&sceneId=' +
      sceneId +
      '&name=' +
      name +
      '&description=' +
      description +
      '&longitude=' +
      longitude +
      '&latitude=' +
      latitude;
    this.getSceneInfo(body, function(json) {
      if (json.statusCode === 200) {
        self.openUserPage();
      }
    });
  }

  handleCheck = event => {
    // here's your checked Value
    var self = this;
    var toggleBounce = function() {
      if (self.geoMarker.getAnimation() !== null) {
        self.geoMarker.setAnimation(null);
      } else {
        self.geoMarker.setAnimation(google.maps.Animation.BOUNCE);
      }
    };

    if (event.target.checked) {
      document.getElementById('map').style.display = 'block';
      document.getElementById('map').style.height = '300px';
      var geo = this.state.geolocation
        ? {
            latitude: this.state.geolocation.coordinates[1],
            longitude: this.state.geolocation.coordinates[0],
          }
        : { latitude: -34.397, longitude: 150.644 };
      var map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: geo.latitude, lng: geo.longitude },
        zoom: 8,
      });
      this.geoMarker = new google.maps.Marker({
        map: map,
        draggable: true,
        animation: google.maps.Animation.DROP,
        position: { lat: geo.latitude, lng: geo.longitude },
      });
      this.geoMarker.addListener('click', toggleBounce);
    } else {
      document.getElementById('map').style.display = 'none';
    }
  };

  componentDidMount() {}

  render() {
    var json = cookie.load('user');
    if (typeof json === 'undefined' || userCookie.user.username === 'guest') {
      this.openRoute('/');
    }
    if (!this.state.load) return null;
    return (
      <div className={styles.container}>
        <div className={styles.appbar}>
          <UIAppBar
            titleText="Station Settings"
            leftIcon={navigationBackButton(this.openUserPage)}
          />
        </div>
        <div className={styles.mainBlock}>
          <div className={styles.paper}>
            <div>
              <h2 style={{ margin: '25px' }}>Station Settings</h2>
              <Divider />
              <div className="textField1">
                <TextField
                  floatingLabelText="Station Name"
                  defaultValue={this.state.name}
                  style={{ marginTop: 20, marginBottom: 20, marginLeft: 20 }}
                  underlineShow={true}
                  errorText={this.state.nameError}
                  onChange={this.handleNameChange}
                  floatingLabelStyle={{ fontSize: 20, fontWeight: 'bold' }}
                />
              </div>
              <div className="textField1">
                <TextField
                  defaultValue={this.state.description}
                  onChange={this.handleDescriptionChange}
                  style={{ marginTop: 20, marginBottom: 20, marginLeft: 20 }}
                  floatingLabelText="Station description"
                  underlineShow={true}
                  multiLine={true}
                  floatingLabelStyle={{ fontSize: 20, fontWeight: 'bold' }}
                />
              </div>
              <div>
                <Checkbox
                  id="selectLoc"
                  label="Select Location"
                  style={{ margin: 20 }}
                  defaultChecked={false}
                  onCheck={this.handleCheck}
                />
              </div>
              <div>
                <div id="map" />
              </div>
              <Divider style={{ marginTop: 30, marginBottom: 30 }} />
              <div>
                <br />
                <RaisedButton
                  label="Update"
                  primary={true}
                  disabled={this.state.btnDisabled}
                  style={{ marginBottom: 12, marginLeft: 20 }}
                  onTouchTap={this.handleSubmit}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

SettingPage.propTypes = {
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
)(SettingPage);
