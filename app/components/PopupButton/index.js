import React, { Component } from 'react';

import IconButton from 'material-ui/IconButton';
import Paper from 'material-ui/Paper';

import Rotate from 'material-ui/svg-icons/action/cached';
import Translate from 'material-ui/svg-icons/action/open-with';
import Delete from 'material-ui/svg-icons/action/delete';
import ContentCopy from 'material-ui/svg-icons/content/content-copy';

export default class PopupButton extends Component {
  constructor(props) {
    super(props);

    this.state = {
      open: false,
    };
  }

  handleTouchTap = event => {
    // This prevents ghost click.
    event.preventDefault();
    this.setState({
      open: true,
      anchorEl: event.currentTarget,
    });
  };

  handleRequestClose = () => {
    this.setState({
      open: false,
    });
  };

  render() {
    const { actions, selectedItem, activeManipulator } = this.props;
    if (!!selectedItem) {
      return (
        <div>
          {activeManipulator === 'translateItem' && (
            <IconButton
              iconStyle={{ color: 'white' }}
              onTouchTap={() => {
                actions.switchTools('rotateItem');
                this.setState({ open: false });
              }}
            >
              <Rotate />
            </IconButton>
          )}
          {activeManipulator === 'rotateItem' && (
            <IconButton
              iconStyle={{ color: 'white' }}
              onTouchTap={() => {
                actions.switchTools('translateItem');
                this.setState({ open: false });
              }}
            >
              <Translate />
            </IconButton>
          )}

          {
            <IconButton
              onTouchTap={actions.copy}
              iconStyle={{ color: 'white' }}
            >
              <ContentCopy />
            </IconButton>
          }
          {
            <IconButton
              onTouchTap={actions.delete}
              iconStyle={{ color: 'white' }}
            >
              <Delete />
            </IconButton>
          }
        </div>
      );
    } else {
      return null;
    }
  }
}

PopupButton.propTypes = {
  //menu: React.PropTypes.object,
  // onTouchTap: React.PropTypes.func,
};
