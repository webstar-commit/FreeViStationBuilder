import React, { Component } from 'react';
import moment from 'moment';
import cookie from 'react-cookie';
import List from 'material-ui/List/List';
import ListItem from 'material-ui/List/ListItem';
import Avatar from 'material-ui/Avatar';
import Paper from 'material-ui/Paper';
import styles from './styles.css';
import { Card, CardHeader, CardText } from 'material-ui/Card';
import RaisedButton from 'material-ui/RaisedButton';
import TextField from 'material-ui/TextField';

export default class CommentCard extends Component {
  constructor(props) {
    super(props);
    this.state = {
      comments: null,
      postComment: '',
      commentError: '',
    };
    this.putComment = this.putComment.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  componentDidMount() {
    this.fetchComments(this.props.sceneId);
  }

  fetchComments = sceneId => {
    var self = this;
    var user = cookie.load('user');
    fetch('/stations/comments', {
      method: 'POST',
      mode: 'cors',
      headers: {
        Authorization: 'Basic',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'sceneId=' + sceneId,
    }).then(function(response) {
      response.json().then(function(json) {
        json.reverse();
        self.setState({ comments: json });
        if (self.props.getCommentCount) self.props.getCommentCount(json.length);
      });
    });
  };

  putComment(e) {
    if (this.state.commentError !== '') {
      this.setState({ commentError: '', postComment: e.target.value });
    } else this.setState({ postComment: e.target.value });
  }

  postComments = sceneId => {
    var self = this;
    var comment = this.state.postComment;
    var user = cookie.load('user');
    return fetch('/stations/comment', {
      method: 'POST',
      mode: 'cors',
      headers: {
        Authorization: 'Basic',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'sceneId=' + sceneId + '&content=' + comment,
    })
      .then(function(response) {
        self.setState({ postComment: '' });
      })
      .catch(function(err) {
        console.log('[ERR]: ', err);
      });
  };

  handleSubmit(event) {
    var self = this;
    if (this.state.postComment === '') {
      this.setState({ commentError: 'Comment is empty' });
      return;
    }
    this.postComments(this.props.sceneId).then(function() {
      self.fetchComments(self.props.sceneId);
    });
  }
  render() {
    if (this.state.comments) {
      const comments = this.state.comments;
      return (
        <div>
          <div style={{ width: '100%' }}>
            <TextField
              style={{ margin: '12px' }}
              value={this.state.postComment}
              errorText={this.state.commentError}
              onChange={this.putComment}
              hintText="Post Your Comment"
              floatingLabelText="Comment"
              type="componentDidMount"
              fullWidth={true}
              multiLine={true}
            />
            <RaisedButton
              label="Post"
              style={{ margin: '12px' }}
              primary={true}
              onTouchTap={this.handleSubmit}
            />
          </div>
          <div>
            {comments.map(comment => {
              return (
                <Card className={styles.card} key={comment._id}>
                  <CardHeader
                    title={comment.owner}
                    subtitle={moment(comment.createdAt).fromNow()}
                    avatar={
                      'https://www.gravatar.com/avatar/' +
                      comment.user.gravatarHash +
                      '.jpg?d=https://clara.io/img/default_avatar.png'
                    }
                  />
                  <CardText>{comment.content}</CardText>
                </Card>
              );
            })}
          </div>
        </div>
      );
    } else {
      return null;
    }
  }
}

CommentCard.propTypes = {};
