import React from 'react';
import Dialog from 'material-ui/Dialog'
import FlatButton from 'material-ui/FlatButton'

function MyDialog(props) {
  const actions = [
    <FlatButton
      label="Ok"
      primary={true}
      keyboardFocused={true}
      onTouchTap={props.handleClose}
    />,
  ];
  return (
    <Dialog
      style={{ zIndex: 214748364 }}
      actions={props.actions || actions}
      modal={false}
      open={props.dialogOpen}
      onRequestClose={props.handleClose}
    >
    {props.message}
  </Dialog>
  );
}
MyDialog.propTypes = {
  dialogOpen:React.PropTypes.bool,
  handleClose:React.PropTypes.func,
  message:React.PropTypes.string,
  actions: React.PropTypes.array,
};


export default MyDialog;
