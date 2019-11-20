import React, { Component } from 'react';

import FloatingActionButton from 'material-ui/FloatingActionButton';
import ContentAdd from 'material-ui/svg-icons/content/add';
import IconMenu from 'material-ui/IconMenu';

export default class UIPlusButton extends Component {

  handleClose = () => {
    this.props.openClose(false);
  };
  handleOpen (){
    this.props.openClose(true);
  }
  openClose(){

  }
  render() {
    const menu = React.Children.map(this.props.menu,
     (child) => React.cloneElement(child, {
       actions: this.handleClose,
     })
    );
    const width = ( window.innerWidth > 0) ? window.innerWidth : screen.width;
    return (
      <IconMenu
        ref="IconMenu"
        iconButtonElement={
          <FloatingActionButton mini={true} backgroundColor={"red"} onTouchTap={ this.props.click ? this.props.click : this.handleOpen.bind(this)}>
            <ContentAdd />
          </FloatingActionButton>
        }
        menuStyle={{
          overflowX:'hidden',
          paddingTop: 0,
          width: 0.5*width,
          paddingTop: '0px'
        }}
        anchorOrigin={{vertical:'bottom', horizontal:'right'}}
        targetOrigin={{vertical:'bottom', horizontal:'right'}}
        open={this.props.open}
      >
        {menu}
      </IconMenu>
    );
  }
}

UIPlusButton.propTypes = {
  menu: React.PropTypes.object,
  onTouchTap: React.PropTypes.func,
};
