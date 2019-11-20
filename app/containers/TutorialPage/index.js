import React, { Component } from 'react';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';
import { Step, Stepper, StepLabel } from 'material-ui/Stepper';
import RaisedButton from 'material-ui/RaisedButton';
import ExpandTransition from 'material-ui/internal/ExpandTransition';
import cookie from 'react-cookie';
import moment from 'moment';
import UIUserDrawer from 'components/UIUserDrawer';
import { cyan500 } from 'material-ui/styles/colors';
import apartment3 from './img/Apartment_03.png';
import apartment2 from './img/Ap2_01.png';
import ReactLetterAvatar from 'react-letter-avatar';
import stationLocation from './img/station_location.png';
import styles from './styles.css';
import store from './img/vitokens.png';
import stationDemo from './img/stationDemo.png';
import editStation from './img/edit_station.png';
import avatar1 from './img/avatar11.png';
import VW from './img/VW.png';
import BH from './img/enterVW.png';
import avatar2 from './img/avatar22.png';
import UIAppBar from 'components/UIAppBar';
const getStyles = () => {
  return {
    root: {
      width: '100%',
      maxWidth: 700,
      margin: 'auto',
    },
    content: {
      margin: '0 16px',
    },
    actions: {
      marginTop: 12,
    },
    backButton: {
      marginRight: 12,
    },
  };
};
const mobile =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) && !window.MSStream;

export class GranularControlStepper extends Component {
  constructor(props) {
    super(props);
    this.state = {
      stepIndex: null,
      visited: [],
      sceneId: null,
      mobile: mobile,
    };
    console.log(
      moment()
        .utc()
        .format('LLLL')
    );
    var userCookie = cookie.load('user');
    if (
      typeof userCookie === 'undefined' ||
      userCookie.user.username === 'guest'
    )
      return;
  }

  openRoute = route => {
    this.props.changeRoute(route);
  };
  openNewStationPage = sceneId => {
    if (!sceneId) {
      //please select a sceneId
    }
    this.openRoute('/stations/new/' + sceneId);
  };

  dummyAsync = cb => {
    this.setState({ loading: true }, () => {
      this.asyncTimer = setTimeout(cb, 500);
    });
  };

  handleNext = () => {
    const { stepIndex } = this.state;
    const sceneId = this.state.sceneId;
    if (stepIndex === 4) {
      this.openNewStationPage(sceneId);
    } else if (!this.state.loading) {
      this.dummyAsync(() =>
        this.setState({
          loading: false,
          stepIndex: stepIndex + 1,
          finished: stepIndex >= 4,
        })
      );
    }
  };
  handlePrev = () => {
    const { stepIndex } = this.state;
    if (!this.state.loading) {
      this.dummyAsync(() =>
        this.setState({
          loading: false,
          stepIndex: stepIndex - 1,
        })
      );
    }
  };

  getStepContent(stepIndex) {
    const sceneId = this.state.sceneId;
    switch (stepIndex) {
      case 0:
        return (
          <div>
            <div style={{ marginLeft: '5%' }}>
              <h2>
                {' '}
                Welcome to ViMarket! Before you get started we want to walk you
                through a few quick steps:{' '}
              </h2>
            </div>
            <div style={{ marginLeft: '5%' }}>
              <h3> 1. Avatar Image</h3>
              <p>
                To help differentiate users, we use avatar images. If you’ve
                logged in through Facebook, we’ll simply use your profile
                picture. Otherwise, we’ll assign an avatar image using your
                first initial.
              </p>
            </div>
            <div style={{ textAlign: 'center', marginTop: '5%' }}>
              <img
                src={avatar1}
                className={styles.station}
                style={{ marginRight: '2%', width: '300px', height: '300px' }}
              />
              <img
                src={avatar2}
                className={styles.station}
                style={{ marginTop: '5%', width: '300px', height: '300px' }}
              />
            </div>
          </div>
        );
      case 1:
        return (
          <div>
            <div style={{ marginLeft: '5%', marginTop: '3%' }}>
              <h3> 2. Exploring the Virtual World</h3>
              <p>
                We built a virtual world for you to explore. Swipe sideways and
                up/down to move around and select a Starter Station.
                Alternatively, you can use the search function to quickly
                discover more Stations.
              </p>
              <p>
                {' '}
                To view another user's Station, simply click on their avatar
                image. You may also enter Shops by clicking them.
              </p>
            </div>
            <div style={{ marginTop: '3%', textAlign: 'center' }}>
              <img
                src={VW}
                className={styles.station}
                style={{ marginRight: '2%' }}
              />
              <img
                src={BH}
                className={styles.station}
                style={{ marginTop: '5%' }}
              />
            </div>
          </div>
        );
      case 2:
        return (
          <div>
            <div style={{ marginLeft: '5%', marginTop: '3%' }}>
              <h3>4. Interacting and Editing Your Station </h3>
              <p>
                {' '}
                You can interact with Stations by liking or commenting on the
                view page, using the buttons in the top right corner.
              </p>
              <p> You could also edit your stations. </p>
            </div>
            <div style={{ marginTop: '5%', textAlign: 'center' }}>
              <img src={stationDemo} className={styles.station} />
            </div>
            <div style={{ marginLeft: '5%', marginTop: '3%' }}>
              <p>
                {' '}
                In ‘Edit Mode’ you are able to decorate the room using furniture
                purchased with Vitokens. The changes you make will be auto saved
                when you leave you th7341edc2e edit mode.{' '}
              </p>
              <p>
                {' '}
                You can also enter ‘VR Mode*’ by clicking on the button in the
                left bottom corner (*VR must be enabled on your device).
              </p>
            </div>
            <div style={{ textAlign: 'center', marginTop: '3%' }}>
              <img src={editStation} className={styles.station} />
            </div>
          </div>
        );
      case 3:
        return (
          <div>
            <div style={{ marginLeft: '5%', marginTop: '3%' }}>
              <h3>5. Using vit </h3>
              <p>
                {' '}
                Vits are used as currency in ViMarket to purchase furniture,
                products and models. To purchase vit, please tap on your vit
                balance
              </p>
              <p> Your vit balance can be found at the bottom of pages.</p>
            </div>
            <div style={{ textAlign: 'center', marginTop: '3%' }}>
              <img src={store} className={styles.station} />
            </div>
          </div>
        );
      case 4:
        return (
          <div>
            <div style={{ marginLeft: '5%', marginTop: '3%' }}>
              <h3>6. Select a Station and Get Started</h3>
              <p>
                {' '}
                You’re all set! Click on a template to create your first
                Station!
              </p>
            </div>
            <div
              style={{
                textAlign: 'center',
                marginTop: '3%',
                cursor: 'pointer',
              }}
            >
              <img
                onClick={ev => {
                  this.openNewStationPage(
                    '7341edc2-af51-4bef-acae-db05696922fc'
                  );
                }}
                src={`https://clara.io/api/scenes/7341edc2-af51-4bef-acae-db05696922fc/v2thumbnail?width=400`}
                className={styles.station}
                style={{
                  borderStyle: 'solid',
                  borderSize: 10,
                  borderColor:
                    sceneId === '7341edc2-af51-4bef-acae-db05696922fc'
                      ? cyan500
                      : 'white',
                }}
              />
              <img
                onClick={ev => {
                  this.openNewStationPage(
                    'ecebcd38-6b53-43d5-a6fc-894a6c4549e0'
                  );
                }}
                src={`https://clara.io/api/scenes/ecebcd38-6b53-43d5-a6fc-894a6c4549e0/v2thumbnail?width=400`}
                className={styles.station}
                style={{
                  marginLeft: '3%',
                  borderStyle: 'solid',
                  borderSize: 10,
                  borderColor:
                    sceneId === 'ecebcd38-6b53-43d5-a6fc-894a6c4549e0'
                      ? cyan500
                      : 'white',
                }}
              />
              <img
                onClick={ev => {
                  this.openNewStationPage(
                    '0f481464-2dd9-4fb0-b769-15d257bff6de'
                  );
                }}
                src={`https://clara.io/api/scenes/0f481464-2dd9-4fb0-b769-15d257bff6de/v2thumbnail?width=400`}
                className={styles.station}
                style={{
                  marginLeft: '3%',
                  borderStyle: 'solid',
                  borderSize: 10,
                  borderColor:
                    sceneId === '0f481464-2dd9-4fb0-b769-15d257bff6de'
                      ? cyan500
                      : 'white',
                }}
              />
              <img
                onClick={ev => {
                  this.openNewStationPage(
                    '60004717-dfd9-4a35-806c-7012fc2ad1b1'
                  );
                }}
                src={`https://clara.io/api/scenes/60004717-dfd9-4a35-806c-7012fc2ad1b1/v2thumbnail?width=400`}
                className={styles.station}
                style={{
                  marginLeft: '3%',
                  borderStyle: 'solid',
                  borderSize: 10,
                  borderColor:
                    sceneId === '60004717-dfd9-4a35-806c-7012fc2ad1b1'
                      ? cyan500
                      : 'white',
                }}
              />
            </div>
          </div>
        );
      default:
        return (
          <div>
            <div style={{ marginLeft: '5%' }}>
              <h2>
                {' '}
                Welcome to ViMarket! Before you get started we want to walk you
                through a few quick steps:{' '}
              </h2>
            </div>
            <div style={{ marginLeft: '5%' }}>
              <h3> 1. Avatar Image</h3>
              <p>
                To help differentiate users, we use avatar images. If you’ve
                logged in through Facebook, we’ll simply use your profile
                picture. Otherwise, we’ll assign an avatar image using your
                first initial.
              </p>
            </div>
            <div style={{ textAlign: 'center', marginTop: '5%' }}>
              <img
                src={avatar1}
                className={styles.station}
                style={{ marginRight: '2%', width: '300px', height: '300px' }}
              />
              <img
                src={avatar2}
                className={styles.station}
                style={{ marginTop: '5%', width: '300px', height: '300px' }}
              />
            </div>
          </div>
        );
    }
  }

  renderContent() {
    const { finished, stepIndex } = this.state;
    const contentStyle = { margin: '0 16px', overflow: 'hidden' };

    if (finished) {
      return (
        <div style={contentStyle}>
          <RaisedButton
            onTouchTap={this.openNewStationPage}
            label="Join ViMarket"
          />
        </div>
      );
    }

    return (
      <div style={contentStyle}>
        <div>{this.getStepContent(stepIndex)}</div>
        {stepIndex === 4 ? null : (
          <div
            style={{
              marginTop: '5%',
              marginBottom: '20px',
              textAlign: 'center',
            }}
          >
            <RaisedButton
              label="Back"
              disabled={stepIndex === 0}
              onTouchTap={this.handlePrev}
              style={{ width: '30%', marginRight: '1%' }}
            />
            <RaisedButton
              label={stepIndex === 4 ? 'Start' : 'Next'}
              primary={true}
              disabled={stepIndex === 4 && !this.state.sceneId}
              onTouchTap={this.handleNext}
              style={{ width: '30%' }}
            />
          </div>
        )}
      </div>
    );
  }

  render() {
    const { loading, stepIndex } = this.state;
    var userCookie = cookie.load('user');
    if (typeof userCookie === 'undefined') {
      var user = {
        username: 'guest',
        name: 'guest',
        noGravatar: true,
      };
      userCookie = {
        user: user,
      };
    }
    return (
      <div className={styles.container}>
        <UIAppBar
          titleText="Tutorial"
          leftIcon={
            <div style={{ paddingLeft: 10 }}>
              {' '}
              <UIUserDrawer />{' '}
            </div>
          }
        />
        <Stepper
          style={{ marginLeft: '5%', width: '90%' }}
          activeStep={stepIndex}
        >
          <Step style={{ width: '15%' }}>
            {this.state.mobile ? (
              <StepLabel />
            ) : (
              <StepLabel>Avatar Image</StepLabel>
            )}
          </Step>
          <Step style={{ width: '15%' }}>
            {this.state.mobile ? (
              <StepLabel />
            ) : (
              <StepLabel> Virtual World</StepLabel>
            )}
          </Step>
          <Step style={{ width: '15%' }}>
            {this.state.mobile ? (
              <StepLabel />
            ) : (
              <StepLabel>Edit Station</StepLabel>
            )}
          </Step>
          <Step style={{ width: '15%' }}>
            {this.state.mobile ? <StepLabel /> : <StepLabel>Vit</StepLabel>}
          </Step>
          <Step style={{ width: '15%' }}>
            {this.state.mobile ? (
              <StepLabel />
            ) : (
              <StepLabel>Create Station</StepLabel>
            )}
          </Step>
        </Stepper>
        <ExpandTransition loading={loading} open={true}>
          {this.renderContent()}
        </ExpandTransition>
      </div>
    );
  }
}
GranularControlStepper.propTypes = {
  changeRoute: React.PropTypes.func,
};

function mapDispatchToProps(dispatch) {
  return {
    changeRoute: url => dispatch(push(url)),
  };
}

export default connect(
  null,
  mapDispatchToProps
)(GranularControlStepper);
