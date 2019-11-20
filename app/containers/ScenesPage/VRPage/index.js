import React, { Component } from 'react';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';
import ClaraPlayer from 'components/ClaraPlayer';
import cookie from 'react-cookie';
import IconButton from 'material-ui/IconButton';
import NavigationBack from 'material-ui/svg-icons/navigation/arrow-back';

import styles from './styles.css';


function navigationBackButton(func) {
  return (
    <IconButton onClick={func} >
      <NavigationBack />
    </IconButton>
  );
}

export class VRPage extends Component {
  constructor(props) {
    super(props);

    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const crosswalk = /Crosswalk/.test(navigator.userAgent) && !window.MSStream;

    this.state = {
      renderingMode: 'normal',
      vrCapable: !iOS,
    };
  }

  componentWillMount(){
    const self =this;
    window.addEventListener('resize', (ev) => this.handleResize(ev));
    if(typeof window.navigator.getVRDisplays === 'function') {
      window.navigator.getVRDisplays().then(function(displays) {
        if (displays.length > 0) {
          if(!displays[0].capabilities.canPresent) {
            self.setState({ vrCapable:false });
          }
        }
      });
    }
    else {
      self.setState({ vrCapable:false });
    }
  }

  componentDidUpdate(prevProps, prevState) {

  }

  handleResize() {
  }

  openRoute = (route) => {
    this.props.changeRoute(route);
  };

  openNavBack = () => {
    var userCookie = cookie.load('user');
    const {sceneId} = this.props.params;
    this.openRoute('/user/'+userCookie.user.username);
  };


  switchRenderingMode(mode){
    this.setState({renderingMode:mode});
  };

  change(option, variants){
    const { selectedItem, nodeConfMap } = this.state;
    this.refs.player.change(option, selectedItem, nodeConfMap[selectedItem].scene);
    const newConfig = {...nodeConfMap[selectedItem].config, variants:variants};
    let newNodeMap = nodeConfMap;
    newNodeMap[selectedItem] = {...nodeConfMap[selectedItem], config:newConfig};
    this.setState({nodeConfMap:newNodeMap});
  }
  handleClick() {
    this.switchRenderingMode("VR");
  }

  render() {
    const { renderingMode, vrCapable} = this.state;
    const {sceneId} = this.props.params;
    const playerStyle = {
      position: 'absolute',
      height: '100%',
      width: '100%',
      minWidth: '1px',
      minHeight: '1px',
      backgroundColor: 'transparent'
    };

    return (
      <div className={styles.container} onTouchTap={()=>this.handleClick()}>
        <div className={styles.textField1}>
          <strong style={{fontSize: "80%"}}> Press any button to continue</strong>
        </div>
        <div className={styles.textField2}>
          <strong style={{fontSize: "80%"}}> Press any button to continue</strong>
        </div>
        <div className={styles.mainBlock} ref="playerContainer">
          <ClaraPlayer
            playerStyle={playerStyle}
            ref="player"
            sceneId={sceneId}
            renderingMode={renderingMode}
            vrCapable={vrCapable}
            switchRenderingMode={this.switchRenderingMode.bind(this)}
          />
        </div>
      </div>
    );
  }
}


VRPage.propTypes = {
  changeRoute: React.PropTypes.func,
};

function mapDispatchToProps(dispatch) {
  return {
    changeRoute: (url) => dispatch(push(url)),
  };
}

export default connect(null, mapDispatchToProps)(VRPage);
