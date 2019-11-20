import React, { Component } from 'react';

import IconMenu from 'material-ui/IconMenu';
import IconButton from 'material-ui/IconButton';
import FlatButton from 'material-ui/FlatButton';
import Dialog from 'material-ui/Dialog';

import Paint from 'material-ui/svg-icons/editor/format-paint';
import ContentCopy from 'material-ui/svg-icons/content/content-copy';
import Delete from 'material-ui/svg-icons/action/delete';
import Cached from 'material-ui/svg-icons/action/cached';
import OpenWith from 'material-ui/svg-icons/action/open-with';
import ThreeDRotation from 'material-ui/svg-icons/action/three-d-rotation';
import Save from 'material-ui/svg-icons/file/cloud-upload';
import { grey50, yellow500 } from 'material-ui/styles/colors';

import ConfigPane from 'components/ConfigPane';

const styles = {
  margin: 12,
};
export default class UIUserMenu extends Component {
  state = {
    open: false,
  };

  handleOpen = () => {
    this.setState({ open: true });
  };

  handleClose = () => {
    this.setState({ open: false });
  };
  render() {
    const { actions, activeManipulator, selectedItem, configMap } = this.props;
    const actionButtons = [
      <FlatButton
        label="Cancel"
        primary
        onTouchTap={this.handleClose}
      />,
    ];
    const colors = ['rotateItem', 'translateItem', 'orbit'].map((tool)=>{
      return tool===activeManipulator ? yellow500 : grey50;
    });
    return (
      <div>
        <IconButton style={styles.button} tooltip="Orbit Mode" onTouchTap={()=>actions.switchTools('orbit')}>
          <ThreeDRotation color={colors[2]} />
        </IconButton>
        {!!selectedItem && <IconButton style={styles.button} tooltip="Rotate Item" onTouchTap={()=>actions.switchTools('rotateItem')}>
          <Cached color={colors[0]} />
        </IconButton>}
        {!!selectedItem && <IconButton style={styles.button} tooltip="Translate Item" onTouchTap={()=>actions.switchTools('translateItem')}>
          <OpenWith color={colors[1]} />
        </IconButton>}
        {
          (!!selectedItem && !!configMap &&!!configMap.config) && <IconMenu
          anchorOrigin={{vertical:'bottom', horizontal:'right'}}
          targetOrigin={{vertical:'top', horizontal:'right'}}
          iconButtonElement={<IconButton style={styles.button} tooltip="Configure Item"><Paint color={grey50} /></IconButton>}
          >
          <ConfigPane configMap={configMap} selectedId={selectedItem} changeScene={actions.changeScene} setMap={actions.setMap}/>
          </IconMenu>
        }
        {!!selectedItem && <IconButton style={styles.button} tooltip="Copy" onTouchTap={actions.copy}>
          <ContentCopy color={grey50} />
        </IconButton>}
        {!!selectedItem && <IconButton style={styles.button} tooltip="Remove" onTouchTap={actions.delete}>
          <Delete color={grey50} />
        </IconButton>}
        <IconButton style={styles.button} tooltip="Save" onTouchTap={actions.save}>
          <Save color={grey50} />
        </IconButton>
        <Dialog
          title="Not Available"
          actions={actionButtons}
          modal={false}
          open={this.state.open}
          onRequestClose={this.handleClose}
        />
      </div>
    );
  }
}
