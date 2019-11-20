import React, { Component } from 'react';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';
import UIAppBar from 'components/UIAppBar';
import styles from './styles.css';
import UIUserDrawer from 'components/UIUserDrawer';
import RaisedButton from 'material-ui/RaisedButton';
export class PlanPage extends Component {
  constructor(props) {
    super(props);
    this.payPlan = this.payPlan.bind(this);
  }
  openRoute = route => {
    this.props.changeRoute(route);
  };
  payPlan(plan) {
    var query = window.location.search;
    if (query && query.indexOf('sceneId') !== -1)
      return this.openRoute('/home/' + plan + '/checkout' + query);
    this.openRoute('/home/' + plan + '/checkout');
  }

  render() {
    return (
      <div className={styles.container}>
        <div className={styles.appBar}>
          <UIAppBar
            titleText="Vitoken packages"
            leftIcon={
              <div style={{ paddingLeft: 10 }}>
                <UIUserDrawer />
              </div>
            }
          />
        </div>
        <div className={styles.mainBlock}>
          <div className={styles.pricingtable}>
            <div className={styles.top}>
              <div>Basic</div>
              <div className={styles.priceul}>
                <li>
                  <strong>Value:</strong>{' '}
                </li>
                <li> 3.0K Vitokens </li>
              </div>
              <hr className={styles.pricehr} />
              <h1 className={styles.price}>
                <sup style={{ fontSize: '45px' }}>$</sup>5
              </h1>
              <RaisedButton
                className={styles.submit}
                onTouchTap={ev => {
                  this.payPlan('Basic');
                }}
                primary={true}
                label="Select"
              />
            </div>
          </div>
          <div className={styles.pricingtable}>
            <div className={styles.top}>
              <div>Standard</div>
              <div className={styles.priceul}>
                <li>
                  <strong>Value:</strong>{' '}
                </li>
                <li> 60.0k Vitokens </li>
              </div>
              <hr className={styles.pricehr} />
              <div className={styles.price}>
                <sup style={{ fontSize: '45px' }}>$</sup>100
              </div>
              <RaisedButton
                className={styles.submit}
                onTouchTap={ev => {
                  this.payPlan('Standard');
                }}
                primary={true}
                label="Select"
              />
            </div>
          </div>
          <div className={styles.pricingtable}>
            <div className={styles.top}>
              <div>Premium</div>
              <div className={styles.priceul}>
                <li>
                  <strong>Value:</strong>{' '}
                </li>
                <li> 300.0k Vitokens </li>
              </div>
              <hr className={styles.pricehr} />
              <h1 className={styles.price}>
                <sup style={{ fontSize: '45px' }}>$</sup>500
              </h1>
              <RaisedButton
                className={styles.submit}
                onTouchTap={ev => {
                  this.payPlan('Premium');
                }}
                primary={true}
                label="Select"
              />
            </div>
          </div>
          <div className={styles.pricingtable}>
            <div className={styles.top}>
              <div>Expert</div>
              <div className={styles.priceul}>
                <li>
                  <strong>Value:</strong>{' '}
                </li>
                <li> 2.0M Vitokens </li>
              </div>
              <hr className={styles.pricehr} />
              <h1 className={styles.price}>
                <sup style={{ fontSize: '45px' }}>$</sup>1000
              </h1>
              <RaisedButton
                className={styles.submit}
                onTouchTap={ev => {
                  this.payPlan('Expert');
                }}
                primary={true}
                label="Select"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
}

function mapDispatchToProps(dispatch) {
  return {
    changeRoute: url => dispatch(push(url)),
  };
}
export default connect(null, mapDispatchToProps)(PlanPage);
