import React, { Component } from 'react';
import cookie from 'react-cookie';
export default class StationInfoPane extends Component {
  constructor(props) {
    super(props);
    this.state = {
      like: null,
      sceneInfo: null,
      likeCount: null,
    };
  }
  componentDidMount() {
    var self = this;
    const { host, sceneId } = self.props;
    //-------------------Fetch API
    var json = cookie.load('user');
    var myheaders = new Headers();
    if (typeof json !== 'undefined') {
    }
    myheaders.append('Content-Type', 'application/x-www-form-urlencoded');
    function fetchData() {
      fetch('/stations/info', {
        method: 'POST',
        mode: 'cors',
        headers: myheaders,
        body: 'sceneId=' + sceneId,
      }).then(function(response) {
        response.json().then(function(result) {
          var info = JSON.parse(result.body);
          self.setState({ sceneInfo: info });
          self.setState({ likeCount: info.likeCount });
          self.setState({ like: info.liked });
          self.props.setSceneInfo(
            self.state.sceneInfo.name,
            self.state.sceneInfo.user.username,
            self.state.sceneInfo.user.gravatarHash,
            self.state.sceneInfo.liked
          );
        });
      });
    }
    //-------------------------------------------------------
    fetchData();
  }

  componentWillUpdate() {}

  componentWillReceiveProps(nextProps) {
    if (nextProps.like !== this.state.like) {
      this.setState({ like: nextProps.like });
      const tmp = this.state.likeCount;
      if (!this.state.like) {
        this.setState({ likeCount: tmp + 1 });
      } else {
        this.setState({ likeCount: tmp - 1 });
      }
    }
  }
  render() {
    if (this.state.sceneInfo) {
      const {
        name,
        owner,
        likeCount,
        viewCount,
        createdAt,
        modifiedAt,
        user,
      } = this.state.sceneInfo;
      var createdDate = createdAt.split('T')[0];
      var modifiedDate = modifiedAt.split('T')[0];

      return (
        <div>
          <table
            style={{
              width: '100%',
              fontFamily: 'Verdana',
              tableLayout: 'fixed',
            }}
          >
            <tbody>
              <tr style={{ fontSize: 30 }}>
                <td style={{ width: '50%', textAlign: 'center' }}>
                  {this.state.likeCount}
                </td>
                <td style={{ width: '50%', textAlign: 'center' }}>
                  {viewCount}
                </td>
              </tr>
              <tr style={{ fontSize: 15 }}>
                <td style={{ width: '50%', textAlign: 'center' }}>likes</td>
                <td style={{ width: '50%', textAlign: 'center' }}>views</td>
              </tr>
              <tr />
            </tbody>
          </table>
          <div style={{ margin: '10px', textAlign: 'center', fontSize: 20 }}>
            Created on {createdDate}
          </div>
          <div style={{ textAlign: 'center', fontSize: 20 }}>
            Modified on {modifiedDate}
          </div>
        </div>
      );
    } else {
      return null;
    }
  }
}

StationInfoPane.propTypes = {};
