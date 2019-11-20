import React, { Component } from 'react';
import UIAppBar from 'components/appComponents/UIAppBar';

export default class UIAppBarContainer extends Component {
  render() {
    return (
      <UIAppBar title={this.props.title} actions={this.props.actions} theme={this.props.theme} />
    );
  }
}
