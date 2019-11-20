import React from 'react';

import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import getMuiTheme from 'material-ui/styles/getMuiTheme';
import AppBar from 'material-ui/AppBar';

import { cyan500, grey900 } from 'material-ui/styles/colors';

const theme = {
  palette: {
    textColor: grey900,
  },
  color: '#34363a',
  appBar: { color: '#34363a', height: 50 },
};

function UIAppBar(props) {
  return (
    <MuiThemeProvider
      muiTheme={
        getMuiTheme(theme)
      }
    >
      <AppBar
        title={props.titleText}
        iconElementLeft={props.leftIcon}
        titleStyle={props.titleStyle}
        style={{paddingLeft:10, paddingRight:10}}
        iconElementRight={props.rightIcon}
      />
    </MuiThemeProvider>
  );
}


UIAppBar.propTypes = {
  titleText: React.PropTypes.string,
  leftIcon: React.PropTypes.object,
  titleStyle: React.PropTypes.object,
  menu: React.PropTypes.object,
  vrToggle: React.PropTypes.object,
};

export default UIAppBar;
