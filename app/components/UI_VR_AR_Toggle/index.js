import React, { Component } from 'react';

import FlatButton from 'material-ui/FlatButton';
import {cyan600, cyan200} from 'material-ui/styles/colors';

import styles from './styles.css';

export default class UIVRARToggle extends Component {
  constructor(props) {
    super(props);
  }
  handleToggle(value) {
    this.props.switchRenderingMode(
      this.props.renderingMode===value ? 'normal': value
    );
  }
  render() {
    const { renderingMode, vrCapable, S3DCapable, arCapable, threeDCapable } = this.props;
    if (!vrCapable && !threeDCapable && !arCapable && !S3DCapable) return null;
    console.log(renderingMode);
    const labelStyle = {padding: '0 0.5em', fontSize:'22px', }
    return (
      <div>
        {threeDCapable && (renderingMode==='3D' || renderingMode==='normal') &&
        <FlatButton
          label={renderingMode==='3D' ? 'Exit 3D' : "3D"}
          onTouchTap={()=>this.handleToggle.bind(this)('3D')}
          className={renderingMode==='3D' ? styles.exitToggleButton : styles.enterToggleButton}
          labelStyle={{padding:0, fontSize:10}}
          style={{width:'40px',lineHeight:'40px',padding:0,marginRight:5}}
          hoverColor={cyan600}
          backgroundColor={cyan200}
        />}
        {S3DCapable && (renderingMode==='3D' || renderingMode==='normal') &&
        <FlatButton
          label={renderingMode==='3D' ? 'Exit S3D' : "S3D"}
          onTouchTap={()=>this.handleToggle.bind(this)('3D')}
          className={renderingMode==='3D' ? styles.exitToggleButton : styles.enterToggleButton}
          labelStyle={{padding:0, fontSize:10}}
          style={{width:'40px',lineHeight:'40px',padding:0,marginRight:5}}
          hoverColor={cyan600}
          backgroundColor={cyan200}
        />}
        {vrCapable && (renderingMode==='VR' || renderingMode==='normal') &&
        <FlatButton
          label={renderingMode==='VR' ? 'Exit VR' : "VR"}
          onTouchTap={()=>this.handleToggle.bind(this)('VR')}
          className={renderingMode==='VR' ? styles.exitToggleButton : styles.enterToggleButton}
          labelStyle={{padding:0, fontSize:10}}
          style={{width:'40px',lineHeight:'40px',padding:0,marginRight:5}}
          hoverColor={cyan600}
          backgroundColor={cyan200}
        />}
        {arCapable && (renderingMode==='AR' || renderingMode==='normal') &&
        <FlatButton
          label={renderingMode==='AR' ? 'Exit AR' : "AR"}
          onTouchTap={() => this.handleToggle.bind(this)('AR')}
          className={renderingMode==='AR' ? styles.exitToggleButton : styles.enterToggleButton}
          labelStyle={{padding:0, fontSize:10}}
          style={{width:'40px',lineHeight:'40px',padding:0}}
          hoverColor={cyan600}
          backgroundColor={cyan200}
        />}
      </div>
    );
  }
}
