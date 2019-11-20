import React, { Component } from 'react';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';
import BuyItem from 'material-ui/svg-icons/action/add-shopping-cart';
import { GridList, GridTile } from 'material-ui/GridList';
import IconButton from 'material-ui/IconButton';
import FlatButton from 'material-ui/FlatButton';
import Dialog from 'material-ui/Dialog';
import IconMenu from 'material-ui/IconMenu';
import Popover from 'material-ui/Popover';
import Menu from 'material-ui/Menu';
import RaisedButton from 'material-ui/RaisedButton';
import cookie from 'react-cookie';
import MenuItem from 'material-ui/MenuItem';
import Badge from 'material-ui/Badge';
import Settings from 'material-ui/svg-icons/action/settings';
import MoreVertIcon from 'material-ui/svg-icons/navigation/more-vert';
import Delete from 'material-ui/svg-icons/action/delete';
import Edit from 'material-ui/svg-icons/image/edit';
import RemoveRedEye from 'material-ui/svg-icons/image/remove-red-eye';
import styles from './styles.css';
import conf from '../../conf';

const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
  navigator.userAgent
);
const adminCookie = [
  'username=FreeVi; Path=/',
  'connect.sess=s%3Aj%3A%7B%22passport%22%3A%7B%22user%22%3A%22FreeVi%22%7D%2C%22notifications%22%3A%5B%5D%7D.uT0XDXuYRgvCvs6FRIr1dw8QR5ZBrIwSeXPAOCrZ1Z4; Path=/; Expires=Fri, 15 Feb 2019 18:53:10 GMT; HttpOnly',
];
export class StationList extends Component {
  constructor(props) {
    super(props);
    this.state = {
      imgError: {},
      template: false,
      library: false,
      open: false,
      anchorEl: null,
      deleteOpen: false,
      targetStation: '',
      sceneInfo: null,
    };
    this.handleRequestClose = this.handleRequestClose.bind(this);
    this.handleClose = this.handleClose.bind(this);
  }
  openRoute = route => {
    this.props.changeRoute(route);
  };

  openEditorPage = (sceneId, owner) => {
    var userCookie = cookie.load('user');
    if (this.props.library) {
      this.openRoute('/editor/' + sceneId);
    } else if (userCookie.user.username === owner) {
      this.openRoute('/station/' + sceneId + '/builder');
    } else this.openRoute('/station/' + sceneId);
  };

  openNewScenePage = sceneId => {
    this.openRoute('/stations/new/' + sceneId);
  };
  openSettingPage = sceneId => {
    this.openRoute('/station/' + sceneId + '/settings');
  };

  componentWillMount() {
    var user = cookie.load('user');
    var username;
    if (this.props.user) username = this.props.user;
    else username = user.user.username;
    var self = this;
    if (this.props.template || this.props.sale) {
      if (this.props.template)
        self.setState({ sceneInfo: this.props.tilesData, template: true });
      else if (this.props.sale && this.props.sale === 'edit')
        self.setState({ sceneInfo: this.props.tilesData, edit: true });
      else if (this.props.sale) {
        self.setState({ sceneInfo: this.props.tilesData, sale: true });
      }
    } else if (this.props.library) {
      self.setState({ sceneInfo: this.props.tilesData, library: true });
    } else {
      fetch('/users/scenes/', {
        method: 'POST',
        mode: 'cors',
        headers: {
          Authorization: 'Basic',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'username=' + username,
      }).then(function(response) {
        response.json().then(function(json) {
          var info = [];
          for (var i in json.models) {
            if (json.models[i]) {
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
          self.setState({ sceneInfo: info });
        });
      });
    }
  }

  handleRequestClose() {
    this.setState({ open: false });
  }

  handleClose() {
    this.setState({ deleteOpen: false });
  }
  openProductPage(sceneId) {
    this.openRoute('/store/' + sceneId);
  }

  deleteStaion = () => {
    var self = this;
    this.setState({ deleteOpen: false });
    const sceneId = this.state.targetStation.sceneId;
    var json = cookie.load('user');
    fetch('/stations/delete', {
      method: 'POST',
      mode: 'cors',
      headers: {
        Authorization: 'Basic',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'sceneId=' + sceneId,
    }).then(function(response) {
      response.json().then(function(result) {
        if (result.statusCode === 200) {
          var info = self.state.sceneInfo;
          var index = info.indexOf(self.state.targetStation);
          info.splice(index, 1);
          self.setState({ sceneInfo: info });
        }
      });
    });
  };
  renderActionIcon(tile) {
    var userCookie = cookie.load('user');
    if (this.state.template) return null;
    if (this.state.sale) {
      if (tile.access) {
        return (
          <RaisedButton
            className={styles.buyItem}
            disabled={true}
            primary={true}
            label="Purchased"
          />
        );
      } else {
        return (
          <RaisedButton
            className={styles.buyItem}
            onTouchTap={ev => {
              ev.preventDefault();
              this.props.PurchaseStation(tile.sceneId);
              ev.stopPropagation();
            }}
            primary={true}
            labelStyle={{ textTransform: 'lowercase' }}
            label="vit 1.0K"
          />
        );
      }
    } else if (this.state.edit) {
      if (tile.access) {
        return null;
      } else {
        return (
          <RaisedButton
            className={styles.buyItem}
            onTouchTap={ev => {
              ev.preventDefault();
              this.props.PurchaseStation(tile.sceneId);
              ev.stopPropagation();
            }}
            primary={true}
            labelStyle={{}}
            label="Buy"
          />
        );
      }
    } else if (this.props.user === userCookie.user.username) {
      return (
        <div>
          <IconButton
            iconStyle={{ color: 'white' }}
            onTouchTap={ev => {
              ev.preventDefault();
              this.setState({
                open: true,
                anchorEl: ev.currentTarget,
                targetStation: tile,
              });
              ev.stopPropagation();
            }}
          >
            <MoreVertIcon />
          </IconButton>
          <Popover
            open={this.state.open}
            anchorEl={this.state.anchorEl}
            zDepth={0}
            anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
            targetOrigin={{ horizontal: 'left', vertical: 'top' }}
            onRequestClose={this.handleRequestClose}
          >
            <Menu>
              <MenuItem
                primaryText="Edit"
                leftIcon={<Edit />}
                onTouchTap={ev => {
                  this.openEditorPage(this.state.targetStation.sceneId);
                }}
              />
              <MenuItem
                primaryText="View"
                leftIcon={<RemoveRedEye />}
                onTouchTap={ev => {
                  this.openEditorPage(this.state.targetStation.sceneId);
                }}
              />
              <MenuItem
                primaryText="Delete"
                leftIcon={<Delete />}
                onTouchTap={ev => {
                  this.setState({ open: false, deleteOpen: true });
                }}
              />
            </Menu>
          </Popover>
        </div>
      );
    } else return null;
  }
  renderTitle(tile) {
    if (this.state.edit) {
      if (tile.access) return tile.title;
      else return 'vit: 1.0K';
    } else return tile.title;
  }

  splitImages() {
    const width = window.innerWidth > 0 ? window.innerWidth : screen.width;
    if (this.state.edit) {
      if (width >= 1024) return 2;
      else return 1;
    } else {
      if (width < 768) return 1;
      else if (width < 1200) return 2;
      else if (width < 1400) return 3;
      else return 4;
    }
  }
  render() {
    var self = this;
    const myPurchase = this.props.myPurchase;
    const actions = [
      <FlatButton label="Yes" primary={true} onTouchTap={this.deleteStaion} />,
      <FlatButton label="No" primary={true} onTouchTap={this.handleClose} />,
    ];
    var userCookie = cookie.load('user');
    if (!this.state.sceneInfo) return null;
    const tilesData = this.state.sceneInfo;
    const col = this.splitImages();
    return (
      <div className={styles.root}>
        <GridList cellHeight={'auto'} cols={col} className={styles.gridList}>
          {tilesData.map(tile => {
            if (!tile.access && myPurchase) return <GridList />;
            const imgSrc =
              'https://' +
              conf.hostCL +
              '/api/scenes/' +
              tile.sceneId +
              '/' +
              tile.thumbnail +
              '?width=400';
            return (
              <GridTile
                onTouchTap={ev => {
                  if (self.state.sale) {
                    return null;
                  } else if (self.state.edit) {
                    if (tile.access) {
                      self.props.addNewItem(tile.sceneId);
                      self.props.actions();
                    } else return null;
                  } else if (!self.state.template) {
                    self.openEditorPage(tile.sceneId, tile.author);
                  } else {
                    self.openNewScenePage(tile.sceneId);
                  }
                }}
                className={styles.gridTile}
                key={tile.sceneId}
                titleStyle={{ width: '150px', overflow: 'hidden' }}
                title={self.renderTitle(tile)}
                actionIcon={this.renderActionIcon(tile)}
              >
                <img
                  onClick={ev => {
                    if (this.state.sale) {
                      return this.openProductPage(tile.sceneId);
                    } else return null;
                  }}
                  src={imgSrc}
                  style={{ width: '100%', height: '100%' }}
                  role="presentation"
                />
              </GridTile>
            );
          })}
        </GridList>
        <div>
          <Dialog
            title="Would you like to delete the station?"
            actions={actions}
            modal={false}
            open={this.state.deleteOpen}
            onRequestClose={this.handleClose}
          />
        </div>
      </div>
    );
  }
}

StationList.propTypes = {
  changeRoute: React.PropTypes.func,
  tilesData: React.PropTypes.array,
  user: React.PropTypes.string,
};

function mapDispatchToProps(dispatch) {
  return {
    changeRoute: url => dispatch(push(url)),
  };
}

export default connect(
  null,
  mapDispatchToProps
)(StationList);
