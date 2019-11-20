import React, { Component } from 'react';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';
import StationList from 'components/StationList';
import UIAppBar from 'components/UIAppBar';
import UserInfoPane from 'components/UserInfoPane';
import IconButton from 'material-ui/IconButton';
import NavigationBack from 'material-ui/svg-icons/navigation/arrow-back';
import Menu from 'material-ui/Menu';
import UIUserDrawer from 'components/UIUserDrawer';
import cookie from 'react-cookie'
import styles from './styles.css';
import Upload from 'material-ui/svg-icons/file/file-upload';
import Notifications from 'components/Notifications'
import Create from 'material-ui/svg-icons/content/add-circle';
import Drawer from 'material-ui/Drawer';
import conf from '../../../conf';

function navigationBackButton(func) {
  return (
    <IconButton onTouchTap={func} >
      <NavigationBack />
    </IconButton>
  );
}
export class UserPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      scenesInfo: null,
    };
  }

  openRoute = (route) => {
    this.props.changeRoute(route);
  };

  openLibraryPage = () => {
    this.openRoute('/library');
  };

  openNewStationPage = () => {
    this.openRoute('/templates');
  }
  getScenesInfo(info) {
    this.setState({scenesInfo: info})
  };

  componetDidMount(){

  }

  render() {
    const userCookie = cookie.load('user');
    const {userName} = this.props.params;
    if(typeof userCookie === 'undefined') {
      this.openRoute('/');
      return null;
    }
    else {
      const user = userCookie.user;
      return (
        <div className={styles.container}>
          <div className={styles.appbar}>
            <UIAppBar
              titleText='My Stations'
              leftIcon={<div style={{paddingLeft:10}}><UIUserDrawer/></div>}
             // rightIcon={<div><Notifications/></div>}
              rightIcon={<div> <IconButton tooltip="New Station"
                          onTouchTap={this.openNewStationPage}
                          iconStyle={{color:'white',marginRight:20}}>
                           <Create />
                        </IconButton></div>}
            />
          </div>
          {(userName !== userCookie.user.username) ?<div className={styles.userInfoPane}>
            <UserInfoPane
              host={conf.host}
              userName={userName}
              userToken={userCookie.user.apiToken}
              getScenesInfo={this.getScenesInfo.bind(this)}
            />
          </div>:<div></div> }
          <div className={styles.stationList} >
            <StationList user={userName}/>
         </div>
      </div>
      );
    }
  }
}


UserPage.propTypes = {
  changeRoute: React.PropTypes.func,
};

function mapDispatchToProps(dispatch) {
  return {
    changeRoute: (url) => dispatch(push(url)),
  };
}

// Wrap the component to inject dispatch and state into it
export default connect(null, mapDispatchToProps)(UserPage);
