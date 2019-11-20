import React from 'react';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';
import RaisedButton from 'material-ui/RaisedButton';

import { cyan500 } from 'material-ui/styles/colors';

export function NotFound(props) {
  return (
    <article>
      <div style={{ margin: 30, fontSize: 40, fontFamily: 'Verdana', color: cyan500 }}>Page Not Found</div>
      <RaisedButton
        handleRoute={function redirect() {
          props.changeRoute('/');
        }}
      >
        Home
      </RaisedButton>
    </article>
  );
}

NotFound.propTypes = {
  changeRoute: React.PropTypes.func,
};

// react-redux stuff
function mapDispatchToProps(dispatch) {
  return {
    changeRoute: (url) => dispatch(push(url)),
  };
}

// Wrap the component to inject dispatch and state into it
export default connect(null, mapDispatchToProps)(NotFound);
