import React, { Component } from 'react';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';
import UIAppBar from 'components/UIAppBar';
import StationList from 'components/StationList';
import cookie from 'react-cookie';
import IconButton from 'material-ui/IconButton';
import NavigationBack from 'material-ui/svg-icons/navigation/arrow-back';
import styles from './styles.css';

function navigationBackButton(func) {
  return (
    <IconButton onTouchTap={func}>
      <NavigationBack />
    </IconButton>
  );
}

// const tilesData = [
//   {
//     title: 'Station1',
//     author: 'freevi',
//     sceneId: '29235963-3a65-4ada-b14d-a921ff23eac9',
//     visibility: 'public',
//     thumbnail: 'thumbnail.jpg',
//   },
//   {
//     title: 'Station2',
//     author: 'freevi',
//     sceneId: 'f1b8ad79-c913-45d5-8920-096dc6eb4e64',
//     visibility: 'public',
//     thumbnail: 'thumbnail.jpg',
//   },
//   {
//     title: 'Station3',
//     author: 'freevi',
//     sceneId: 'a0866451-5e81-44b2-b330-b21a8f1af823',
//     visibility: 'public',
//     thumbnail: 'thumbnail.jpg',
//   },
//   {
//     title: 'Station4',
//     author: 'freevi',
//     sceneId: 'e4f95ed3-c5d3-4561-8651-a874819e9cd8',
//     visibility: 'public',
//     thumbnail: 'v2thumbnail',
//   },
// ];


// CHANGE TO CLARA TEMPLATE ID :ZZ 19/07
// content: 'c7d83f84-0dea-4ccc-b406-08d29deb2056',
const collection = {
  title: 'Template',
  content: 'b73a8d6d-bd14-4b2b-96ea-d63209609e0f',
};

export class TemplatePage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      appBarTitle: 'Station Templates',
      listName: 'Template',
      leftIcon: 'muidocs-icon-navigation-expand-more',
      template: 'bc13457c-39ed-41ad-8b14-cddeb49edb32',
    };
    this.templateSelect = this.templateSelect.bind(this);
  }

  componentDidMount() {
    var self = this;
    var userCookie = cookie.load('user');
    self.fetchCollection(collection.content, function(json) {
      let contents = [];
      for (var j = 0; j < json.models.length; j++) {
        var content = {};
        content.title = json.models[j].name;
        content.sceneId = json.models[j]._id;
        content.thumbnail = 'v2thumbnail';
        contents.push(content);
      }
      self.setState({ tilesData: contents });
    });
  }

  createCORSRequest(method, url) {
    var xhr = new XMLHttpRequest();
    if ('withCredentials' in xhr) {
      // XHR for Chrome/Firefox/Opera/Safari.
      xhr.open(method, url, true);
      xhr.setRequestHeader(
        'Authorization',
        'Basic ' + 'FreeVi:c56a71dd-f92e-4c22-8168-fb73f66a9cc3'
      );
    } else if (typeof XDomainRequest != 'undefined') {
      // XDomainRequest for IE.
      xhr = new XDomainRequest();
      xhr.open(method, url);
      xhr.setRequestHeader(
        'Authorization',
        'Basic ' + 'FreeVi:c56a71dd-f92e-4c22-8168-fb73f66a9cc3'
      );
    } else {
      // CORS not supported.
      xhr = null;
    }
    return xhr;
  }
// change by zz 19/07
  fetchCollection(id, callback) {
    var url =
      'https://clara.io/api/users/FreeVi/scenes?collection=' + id;
    var xhr = this.createCORSRequest('GET', url);
    if (!xhr) {
      alert('CORS not supported');
      return;
    }

    // Response handlers.
    xhr.onload = function() {
      var json = JSON.parse(xhr.responseText);
      return callback(json);
    };
    xhr.onerror = function() {
      alert('Woops, there was an error making the request.');
    };

    xhr.send();
  }

  openRoute = route => {
    this.props.changeRoute(route);
  };

  openEditorPage = () => {
    this.openRoute('/editor');
  };

  openUserPage = () => {
    var json = cookie.load('user');
    this.openRoute('/user/' + json.user.username);
  };
  openNewScene = () => {
    const select = this.state.template;
    this.openRoute('/stations/new/' + select);
  };

  templateSelect = event => {
    this.setState({ template: event.target.value });
  };
  render() {
    var userCookie = cookie.load('user');
    if (
      typeof userCookie === 'undefined' ||
      userCookie.user.username === 'guest'
    ) {
      this.openRoute('/');
      return null;
    }
    const tilesData = this.state.tilesData;
    if (!tilesData) return null;
    return (
      <div className={styles.container}>
        <div className={styles.appbar}>
          <UIAppBar
            titleText="New Station"
            leftIcon={navigationBackButton(this.openUserPage)}
          />
        </div>
        <div className={styles.mainBlock}>
          <div className={styles.title}>Choose Your Station Template</div>
          <div className={styles.stationList}>
            <StationList
              name={this.state.listName}
              tilesData={tilesData}
              template={true}
            />
          </div>
        </div>
      </div>
    );
  }
}

TemplatePage.propTypes = {
  changeRoute: React.PropTypes.func,
};

function mapDispatchToProps(dispatch) {
  return {
    changeRoute: url => dispatch(push(url)),
  };
}

export default connect(null, mapDispatchToProps)(TemplatePage);
