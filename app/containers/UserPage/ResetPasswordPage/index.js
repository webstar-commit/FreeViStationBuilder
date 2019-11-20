import React, { Component } from 'react';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';
import TextField from 'material-ui/TextField';
import RaisedButton from 'material-ui/RaisedButton';
import Paper from 'material-ui/Paper';
import UIAppBar from 'components/UIAppBar';
import styles from './styles.css'
import cookie from 'react-cookie'
import MyDialog from 'components/MyDialog'
import NavigationBack from 'material-ui/svg-icons/navigation/arrow-back';
import IconButton from 'material-ui/IconButton';

function navigationBackButton(func) {
  return (
    <IconButton onClick={func} >
      <NavigationBack />
    </IconButton>
  );
};

export class ResetPass extends Component {
  constructor(props){
    super(props);
    this.state = {
    	username:'',
    	usernameError:'',
      dialogOpen:false
    };
    this.handleNameChange = this.handleNameChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleNameChange(event){
    if(this.state.usernameError!= ""){
      this.setState({usernameError:""});
    }
    this.setState({username:event.target.value});
  }

  openRoute = (route) => {
  	this.props.changeRoute(route);
  };

  openNavBack = () => {
    var json = cookie.load('user');
    if(typeof json ==='undefined'){
      this.openRoute('users/login');
    }
    else{
      this.openRoute('/user/'+json.user.username);
    }
  };

  handleDialogClose(event){
    this.setState({dialogOpen:false});
  };

  handleSubmit(event){
    var self = this;
    fetch('/users/password_reset', {
    method:'POST',
    mode: 'cors',
    headers:{
      'Authorization':'Basic',
      'Content-Type':'application/x-www-form-urlencoded'
    },
    body:'username='+self.state.username
  }).then(function(response){
  	 response.json().then(function(json){
  	  if(json.statusCode == 200){
  	  	self.setState({dialogOpen:true})
  	  }
  	  else{
  	  	self.setState({usernameError:'User not found '});
	  }
  	 });
  });
}

	render() {
    var json = cookie.load('user');
    if(typeof json !== 'undefined'){
      this.openUserPage(json.user.username);
      return null;
    }
    return (
      <div className={styles.container}>
        <div className={styles.appBar}>
          <UIAppBar titleText="Reset Password" leftIcon={navigationBackButton(this.openNavBack)}/>
        </div>
        <div className = {styles.mainBlock}>
          <div className={styles.paper}>
            <div className={styles.hint}>
              <h4>Enter your username or email address below, we will send you instructions on how to reset your password</h4>
            </div>
            <div className={styles.input}>
  			      <TextField
                errorText = {this.state.usernameError}
                floatingLabelText="Username or Email"
                onChange = {this.handleNameChange}
                hintText="Username or Email Field"
                underlineShow={true}
                floatingLabelStyle={{fontSize:25,fontWeight:'bold'}}
              />
            </div>
            <div className={styles.button}>
              <RaisedButton label="Reset Password" primary={true} onTouchTap={this.handleSubmit}/>
            </div>
          </div>
        </div>
         <MyDialog message={'Email sent, please check your inbox'} dialogOpen={this.state.dialogOpen} handleClose={(ev)=>this.handleDialogClose()} />
      </div>
    );
  }
}

ResetPass.propTypes = {
  changeRoute: React.PropTypes.func,
};

function mapDispatchToProps(dispatch) {
  return {
    changeRoute: (url) => dispatch(push(url)),
  };
}

export default connect(null, mapDispatchToProps)(ResetPass);
