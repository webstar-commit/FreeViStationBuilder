import React, { Component } from 'react';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';
import styles from './styles.css';
import StationList from 'components/StationList';
import cookie from 'react-cookie';
import _ from 'lodash';

export class Accordion extends Component {
  constructor(props) {
    super(props);
    this.state = {
      tilesData: null,
    };
  }

  componentWillMount() {
    var self = this;
    var userCookie = cookie.load('user');
    let accordion = [];
    var userCollection = userCookie.user.purchased;
    _.each(this.props.data, function(collection) {
      self.fetchCollection(collection.content, function(json) {
        let contents = [];
        for (var j = 0; j < json.models.length; j++) {
          var content = {};
          content.access = userCollection.indexOf(json.models[j]._id) !== -1;
          content.title = json.models[j].name;
          content.sceneId = json.models[j]._id;
          content.price = '1.0K';
          content.thumbnail = 'v2thumbnail';
          contents.push(content);
        }
        var item = {
          title: collection.title,
          content: contents,
          open: false,
        };
        var index = self.props.data.indexOf(collection);
        accordion[index] = item;
        self.setState({ accordionItems: accordion });
      });
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

  fetchCollection(id, callback) {
    var url = 'https://clara.io/api/users/FreeVi/scenes?collection=' + id;
    var xhr = this.createCORSRequest('GET', url);
    if (!xhr) {
      alert('CORS not supported');
      return;
    }

    // Response handlers.
    xhr.onload = function() {
      var json = JSON.parse(xhr.responseText);
      console.log(json);
      return callback(json);
    };
    xhr.onerror = function() {
      alert('Woops, there was an error making the request.');
    };

    xhr.send();
  }

  click(i) {
    const newAccordion = this.state.accordionItems.slice();
    const index = newAccordion.indexOf(i);
    newAccordion[index].open = !newAccordion[index].open;
    this.setState({ accordionItems: newAccordion });
  }

  render() {
    if (!this.state.accordionItems) return null;
    var sale = true;
    if (this.props.edit) sale = 'edit';
    const sections = this.state.accordionItems.map(i => (
      <div key={this.state.accordionItems.indexOf(i)}>
        <div
          className={styles.title}
          onClick={ev => {
            this.click(i);
          }}
        >
          <div className={styles.arrowWrapper}>
            <i
              className={
                i.open
                  ? styles.faRotate + ' ' + styles.angleDown
                  : styles.faRotate
              }
            />
          </div>
          <span className={styles.titleText}>{i.title}</span>
        </div>
        <div
          className={
            i.open ? styles.content + ' ' + styles.contentOpen : styles.content
          }
        >
          <div
            className={
              i.open
                ? styles.contentText + ' ' + styles.contentTextOpen
                : styles.contentText
            }
          >
            <StationList
              tilesData={i.content}
              sale={sale}
              myPurchase={this.props.myPurchase}
              addNewItem={this.props.addNewItem}
              actions={this.props.actions}
              buyItem={this.props.buyItem}
              PurchaseStation={this.props.PurchaseStation}
            />
          </div>
        </div>
      </div>
    ));

    return <div className={styles.accordion}>{sections}</div>;
  }
}

Accordion.propTypes = {
  changeRoute: React.PropTypes.func,
  data: React.PropTypes.array,
  inventory: React.PropTypes.bool,
  addNewItem: React.PropTypes.func,
};

function mapDispatchToProps(dispatch) {
  return {
    changeRoute: url => dispatch(push(url)),
  };
}

export default connect(
  null,
  mapDispatchToProps
)(Accordion);
