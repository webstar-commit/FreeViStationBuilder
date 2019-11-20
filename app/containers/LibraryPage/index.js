import React, { Component } from 'react';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';
import UIUserDrawer from 'components/UIUserDrawer';
import UIAppBar from 'components/UIAppBar';
import StationList from 'components/StationList';
import cookie from 'react-cookie';
import Drawer from 'material-ui/Drawer';
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

const tilesData = [
  {
    title: 'Station1',
    author: 'freevi',
    sceneId: '29235963-3a65-4ada-b14d-a921ff23eac9',
    visibility: 'public',
    thumbnail: 'thumbnail.jpg',
  },
  {
    title: 'Station2',
    author: 'freevi',
    sceneId: 'f1b8ad79-c913-45d5-8920-096dc6eb4e64',
    visibility: 'public',
    thumbnail: 'thumbnail.jpg',
  },
  {
    title: 'Station3',
    author: 'freevi',
    sceneId: 'a0866451-5e81-44b2-b330-b21a8f1af823',
    visibility: 'public',
    thumbnail: 'thumbnail.jpg',
  },
  {
    title: 'Station4',
    author: 'freevi',
    sceneId: 'e4f95ed3-c5d3-4561-8651-a874819e9cd8',
    visibility: 'public',
    thumbnail: 'v2thumbnail',
  },
];

export class LibraryPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      appBarTitle: 'Library',
      listName: 'My',
    };
  }

  openRoute = route => {
    this.props.changeRoute(route);
  };

  render() {
    console.log('>>>>>>>>>>>.');
    return (
      <div className={styles.container}>
        <div className={styles.appbar}>
          <UIAppBar titleText={this.state.appBarTitle} />
        </div>
        <div className={styles.mainBlock}>
          <StationList library={true} tilesData={tilesData} />
        </div>
      </div>
    );
  }
}

LibraryPage.propTypes = {
  changeRoute: React.PropTypes.func,
};

function mapDispatchToProps(dispatch) {
  return {
    changeRoute: url => dispatch(push(url)),
  };
}

export default connect(null, mapDispatchToProps)(LibraryPage);
