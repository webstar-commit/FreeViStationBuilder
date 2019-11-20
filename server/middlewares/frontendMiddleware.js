/* eslint-disable global-require */
const express = require('express');
const path = require('path');
const compression = require('compression');
const User = require('../models/User');
const pkg = require(path.resolve(process.cwd(), 'package.json'));
var request = require('request');
var btoa = require('btoa');
var https = require('https');
var jquery = require('https');
var querystring = require('querystring');
var conf = require('../../app/conf');
var stripe = require('stripe')(conf.stripeSecretKey);
var fs = require('fs');

// var tokenUser = {
//   username: 'FreeVi',
//   apiToken: 'c56a71dd-f92e-4c22-8168-fb73f66a9cc3',
// };

var tokenUser = {
  username: 'test1234',
  apiToken: '5eee2e7c-962f-4013-ac86-356b7379b49f',
};

// Dev middleware
const addDevMiddlewares = (app, webpackConfig) => {
  const webpack = require('webpack');
  const webpackDevMiddleware = require('webpack-dev-middleware');
  const webpackHotMiddleware = require('webpack-hot-middleware');
  const compiler = webpack(webpackConfig);
  const middleware = webpackDevMiddleware(compiler, {
    noInfo: true,
    publicPath: webpackConfig.output.publicPath,
    silent: true,
    stats: 'errors-only',
  });

  app.use(middleware);
  app.use(webpackHotMiddleware(compiler));
  // Since webpackDevMiddleware uses memory-fs internally to store build
  // artifacts, we use it instead
  const fs = middleware.fileSystem;

  if (pkg.dllPlugin) {
    app.get(/\.dll\.js$/, (req, res) => {
      const filename = req.path.replace(/^\//, '');
      res.sendFile(path.join(process.cwd(), pkg.dllPlugin.path, filename));
    });
  }

  app.get('/user/:username/verify_email', function(req, res) {
    const username = req.params && req.params.username;
    const query = req.query;
    if (typeof username === 'undefined' || typeof query === 'undefined') {
      return res.json({
        status: 422,
        field: 'username or token',
        message: 'username or token not found',
      });
    }

    const getUrl = 'users' + req.originalUrl.substring(5);

    sendReq('GET', getUrl, req, function(response, body) {
      if (response.statusCode === 404) {
        return res.json({
          status: 404,
          field: 'token',
          message: 'token is not found',
        });
      } else if (response.statusCode === 422) {
        return res.json({
          status: 422,
          field: 'token',
          message: 'Invalid token',
        });
      }
      return res.redirect('/');
    });
  });

  app.get('*', (req, res) => {
    fs.readFile(path.join(compiler.outputPath, 'index.html'), (err, file) => {
      if (err) {
        res.sendStatus(404);
      } else {
        res.send(file.toString());
      }
    });
  });

  function sendReq(option, dest, req, cb, root) {
    var host;

    if (root === 'clara') {
      host = conf.hostCL;
      req.headers.Authorization =
        'Basic ' + btoa('FreeVi:c56a71dd-f92e-4c22-8168-fb73f66a9cc3');
    } else {
      host = conf.host;
    }

    if (req.body.content && req.body.save) {
      req.body = { content: JSON.parse(req.body.content) };
    }
    var myCookie = req.headers['set-cookie'] || '';

    delete req.headers['set-cookie'];
    request(
      {
        uri: 'https://' + host + '/api/' + dest,
        rejectUnauthorized: false,
        method: option,
        headers: {
          Authorization: req.headers['Authorization'] || 'Basic',
          'Content-Type': 'application/x-www-form-urlencoded',
          Cookie: myCookie,
        },
        form: req.body,
      },
      function(error, response, body) {
        console.log(response.statusCode);
        if (error) return console.log(error);
        cb(response, body);
      }
    );
  }

  function validateFacebookInfo(facebookUserId, accessToken, cb) {
    request(
      {
        uri: 'https://graph.facebook.com/me?access_token=' + accessToken,
        method: 'GET',
      },
      function(error, response, body) {
        if (error) return cb(error);
        if (response && response.statusCode === 200) {
          cb(null, body);
        } else cb(true);
      }
    );
  }

  async function facebookLogin(req, res) {
    if (
      typeof req.body.facebookUserId === 'undefined' ||
      typeof req.body.accessToken === 'undefined'
    ) {
      return res.send(422, {
        message: 'No facebookUserId or accessToken found in the request',
        errors: [{ field: 'facebookUserId or accessToken', code: 'not found' }],
      });
    }

    await validateFacebookInfo(
      req.body.facebookUserId,
      req.body.accessToken,
      async function(err, facebookInfo) {
        if (facebookInfo) facebookInfo = JSON.parse(facebookInfo);
        if (
          err ||
          req.body.facebookUserId !== facebookInfo.id ||
          req.body.name !== facebookInfo.name
        ) {
          return res.send(422, {
            message: 'facebookUserId or accessToken not correct',
            errors: [
              { field: 'facebookUserId or accessToken', code: 'not correct' },
            ],
          });
        }

        const user = await User.findUser(null, {
          facebookUserId: req.body.facebookUserId,
        });
        if (user) return res.send(user);
        if (typeof req.body.email === 'undefined') {
          return res.send(422, {
            message: 'No email found in the request',
            errors: [{ field: 'email', code: 'not found' }],
          });
        }
        var updateFields = {
          facebookUserId: req.body.facebookUserId,
        };
        if (req.body.gender) updateFields.gender = req.body.gender;
        if (req.body.birth) updateFields.birth = req.body.birth;

        var attrs = {
          username: facebookInfo.name,
          password: Math.random()
            .toString(36)
            .replace(/[^a-z]+/g, '')
            .substr(0, 10),
          facebookUserId: req.body.facebookUserId,
          email: req.body.email,
          name: req.body.name,
          gender: req.body.gender,
          birth: req.body.birth,
        };
        const newUser = await User.createUser(attrs);
        return res.send(newUser);
      }
    );
  }

  function createEtherscanTransaction(txhash, callback) {}

  function checkEtherscanReceipt(receipt, callback) {}

  async function addViTouser(req) {
    const username = req.body.username;
    const amount = req.body.amount;
    const user = await User.updateUser(username, { balance: amount });
    return user;
  }

  app.post('/home/checkout', function(req, res) {
    var stripeToken = req.body.stripeToken;
    var amount = req.body.amount;
    stripe.charges.create(
      {
        card: stripeToken,
        currency: 'usd',
        amount: Number(amount),
      },
      function(err, charge) {
        if (err) {
          res.send(500, err);
        } else {
          res.send(200, charge);
        }
      }
    );
  });

  app.post('/home/settings/password', async function(req, res, next) {
    const username = req.body.username;
    const user = await User.updateUser(username, {
      password: req.body.password,
    });
    res.send(user);
  });

  app.post('/users/password_reset', function(req, res, next) {
    sendReq('POST', 'sessions/forgot_password', req, function(response, body) {
      res.send(response);
    });
  });

  app.post('/home/settings/email', function(req, res, next) {
    res.send('ok');
  });

  app.post('/home/settings/profile', async function(req, res, next) {
    const username = req.body.username;
    const user = await User.updateUser(username, { email: req.body.newEmail });
    res.send(user);
  });

  app.post('/home/settings/email', function(req, res, next) {
    sendReq(
      'POST',
      'users/' + req.body.username + '/send_verification',
      req,
      function(response, body) {
        res.send(response);
      }
    );
  });

  app.post('/users/new', async function(req, res, next) {
    const attrs = req.body;
    const user = await User.createUser(attrs);
    res.send(user);
  });

  app.post('/users/login', async function(req, res, next) {
    const attrs = req.body;
    const user = await User.verifyUser(attrs.username, attrs.password);
    res.send({ user });
  });

  app.post('/users/facebooklogin', facebookLogin);

  app.post('/stations', function(req, res, next) {
    req.headers.Authorization =
      'Basic ' + btoa('FreeVi:c56a71dd-f92e-4c22-8168-fb73f66a9cc3');
    sendReq(
      'GET',
      'scenes',
      req,
      function(response, body) {
        res.send(body);
      },
      'clara'
    );
  });

  app.post('/users', function(req, res, next) {
    req.headers.Authorization =
      'Basic ' + btoa('ziyang:b15bee73-119b-4df1-9c0c-81c581c528ca');
    sendReq('GET', 'users', req, function(response, body) {
      res.send(body);
    });
  });

  app.post('/users/notifications', function(req, res, next) {
    sendReq(
      req.body.method,
      'users/' + req.body.username + '/notifications',
      req,
      function(response, body) {
        res.send(body);
      }
    );
  });

  app.post('/users/message', function(req, res, next) {
    sendReq(
      req.body.method,
      'users/' + req.body.username + '/message',
      req,
      function(response, body) {
        res.send(body);
      }
    );
  });

  app.post('/users/preferences', function(req, res, next) {
    sendReq(
      req.body.method,
      'users/' + req.body.username + '/preferences',
      req,
      function(response, body) {
        res.send(body);
      }
    );
  });

  app.post('/users/transactions', async function(req, res, next) {
    var transactionType = req.body.type;
    if (transactionType === 'buying funds') {
      const update = await addViTouser(req);
      res.send(update);
    } else if (transactionType === 'model purchases') {
      const amount = req.body.amount;
      const purchaseItem = req.body.sceneId;
      const username = req.body.username;
      const user = await User.updateUser(username, {
        balance: '-' + amount,
        purchaseItem,
      });
      res.send(user);
    } else {
      const username = req.body.username;
      const user = await User.findUser(username);
      res.send(user);
    }
  });

  app.post('/users/scenes', async function(req, res, next) {
    const username = req.body.username;
    const scenes = await User.getUserScenes(username);
    res.send({ models: scenes });
  });

  app.post('/stations/new', async function(req, res, next) {
    var query =
      'name=' +
      req.body.name +
      '&visibility=' +
      req.body.visibility +
      '&description=' +
      req.body.description +
      '&tags[0]=freevi';
    sendReq(
      'POST',
      'scenes/' + req.body.sceneId + '/clone?' + encodeURIComponent(query),
      req,
      async function(response, body, error) {
        if (error) {
          console.log('Post scenes to clara failed');
          res.send(response);
        } else {
          var json = JSON.parse(body);
          const username = req.body.username;
          await User.updateUser(username, { scene: json._id });
          res.send(json);
        }
      },
      'clara'
    );
  });

  app.post('/stations/info', function(req, res, next) {
    sendReq(
      req.body.method,
      'scenes/' + req.body.sceneId,
      req,
      function(response, body) {
        res.send(response);
      },
      'clara'
    );
  });

  app.post('/users/info', function(req, res, next) {
    req.headers.Authorization =
      'Basic ' + btoa('Freevi:b15bee73-119b-4df1-9c0c-81c581c528ca');
    delete req.headers['set-cookie'];
    sendReq('GET', 'users/' + req.body.username, req, function(response, body) {
      res.send(body);
    });
  });

  app.post('/stations/comments', function(req, res, next) {
    sendReq(
      'GET',
      'scenes/' + req.body.sceneId + '/comments',
      req,
      function(response, body) {
        res.send(body);
      },
      'clara'
    );
  });

  app.post('/stations/comment', function(req, res, next) {
    sendReq(
      'POST',
      'scenes/' + req.body.sceneId + '/comments',
      req,
      function(response, body) {
        res.send(response);
      },
      'clara'
    );
  });

  app.post('/stations/collection', function(req, res, next) {
    sendReq(
      'GET',
      'collections/' + req.body.collection + '/scenes/',
      req,
      function(response, body) {
        res.send(response);
      },
      'clara'
    );
  });

  app.post('/users/collection', function(req, res, next) {
    sendReq(req.body.method, 'collections', req, function(response, body) {
      res.send(body);
    });
  });
  app.post('/stations/update', function(req, res, next) {
    sendReq(
      'PUT',
      'scenes/' + req.body.sceneId,
      req,
      function(response, body) {
        res.send(body);
      },
      'clara'
    );
  });
  app.post('/stations/delete', function(req, res, next) {
    sendReq(
      'DELETE',
      'scenes/' + req.body.sceneId,
      req,
      function(response, body) {
        res.send(response);
      },
      'clara'
    );
  });

  app.post('/stations/save', function(req, res, next) {
    sendReq(
      'PUT',
      'scenes/' + req.query.sceneId + '/published',
      req,
      function(response, body) {
        res.send(response);
      },
      'clara'
    );
  });

  app.post('/stations/like', function(req, res, next) {
    var option;
    if (req.body.like == 'true') {
      option = 'DELETE';
    } else option = 'POST';
    sendReq(
      option,
      'scenes/' + req.body.sceneId + '/like',
      req,
      function(response, body) {
        res.send(response);
      },
      'clara'
    );
  });
};
// Production middlewares
const addProdMiddlewares = (app, options) => {
  const publicPath = options.publicPath || '/';
  const outputPath = options.outputPath || path.resolve(process.cwd(), 'build');

  // compression middleware compresses your server responses which makes them
  // smaller (applies also to assets). You can read more about that technique
  // and other good practices on official Express.js docs http://mxs.is/googmy

  app.use(compression());
  app.use(publicPath, express.static(outputPath));

  app.get('/user/:username/verify_email', function(req, res) {
    const username = req.params && req.params.username;
    const query = req.query;
    if (typeof username === 'undefined' || typeof query === 'undefined') {
      return res.json({
        status: 422,
        field: 'username or token',
        message: 'username or token not found',
      });
    }

    const getUrl = 'users' + req.originalUrl.substring(5);

    sendReq('GET', getUrl, req, function(response, body) {
      if (response.statusCode === 404) {
        return res.json({
          status: 404,
          field: 'token',
          message: 'token is not found',
        });
      } else if (response.statusCode === 422) {
        return res.json({
          status: 422,
          field: 'token',
          message: 'Invalid token',
        });
      }
      return res.redirect('/');
    });
  });

  app.get('*', (req, res) => {
    //console.log(req.session);
    if (
      !/chunks|claraplayer|\.jpg$|\.ico$|\.png|appcache|\.json/.test(req.path)
    ) {
      res.sendFile(path.resolve(outputPath, 'index.html'));
    } else {
      //    console.log(req.path.substring(22))
      res.sendFile(path.resolve(outputPath, req.path.substring(22)));
    }
  });



  function sendReq(option, dest, req, cb, root) {
    var host;

    if (root === 'clara') {
      host = conf.hostCL;
      req.headers.Authorization =
        'Basic ' + btoa('FreeVi:c56a71dd-f92e-4c22-8168-fb73f66a9cc3');
    } else {
      host = conf.host;
    }

    if (req.body.content && req.body.save) {
      req.body = { content: JSON.parse(req.body.content) };
    }
    var myCookie = req.headers['set-cookie'] || '';

    delete req.headers['set-cookie'];
    request(
      {
        uri: 'https://' + host + '/api/' + dest,
        rejectUnauthorized: false,
        method: option,
        headers: {
          Authorization: req.headers['Authorization'] || 'Basic',
          'Content-Type': 'application/x-www-form-urlencoded',
          Cookie: myCookie,
        },
        form: req.body,
      },
      function(error, response, body) {
        console.log(response.statusCode);
        if (error) return console.log(error);
        cb(response, body);
      }
    );
  }

  function validateFacebookInfo(facebookUserId, accessToken, cb) {
    request(
      {
        uri: 'https://graph.facebook.com/me?access_token=' + accessToken,
        method: 'GET',
      },
      function(error, response, body) {
        if (error) return cb(error);
        if (response && response.statusCode === 200) {
          cb(null, body);
        } else cb(true);
      }
    );
  }

  async function facebookLogin(req, res) {
    if (
      typeof req.body.facebookUserId === 'undefined' ||
      typeof req.body.accessToken === 'undefined'
    ) {
      return res.send(422, {
        message: 'No facebookUserId or accessToken found in the request',
        errors: [{ field: 'facebookUserId or accessToken', code: 'not found' }],
      });
    }

    await validateFacebookInfo(
      req.body.facebookUserId,
      req.body.accessToken,
      async function(err, facebookInfo) {
        if (facebookInfo) facebookInfo = JSON.parse(facebookInfo);
        if (
          err ||
          req.body.facebookUserId !== facebookInfo.id ||
          req.body.name !== facebookInfo.name
        ) {
          return res.send(422, {
            message: 'facebookUserId or accessToken not correct',
            errors: [
              { field: 'facebookUserId or accessToken', code: 'not correct' },
            ],
          });
        }

        const user = await User.findUser(null, {
          facebookUserId: req.body.facebookUserId,
        });
        if (user) return res.send(user);
        if (typeof req.body.email === 'undefined') {
          return res.send(422, {
            message: 'No email found in the request',
            errors: [{ field: 'email', code: 'not found' }],
          });
        }
        var updateFields = {
          facebookUserId: req.body.facebookUserId,
        };
        if (req.body.gender) updateFields.gender = req.body.gender;
        if (req.body.birth) updateFields.birth = req.body.birth;

        var attrs = {
          username: facebookInfo.name,
          password: Math.random()
            .toString(36)
            .replace(/[^a-z]+/g, '')
            .substr(0, 10),
          facebookUserId: req.body.facebookUserId,
          email: req.body.email,
          name: req.body.name,
          gender: req.body.gender,
          birth: req.body.birth,
        };
        const newUser = await User.createUser(attrs);
        return res.send(newUser);
      }
    );
  }

  function createEtherscanTransaction(txhash, callback) {}

  function checkEtherscanReceipt(receipt, callback) {}

  async function addViTouser(req) {
    const username = req.body.username;
    const amount = req.body.amount;
    const user = await User.updateUser(username, { balance: amount });
    return user;
  }

  app.post('/home/checkout', function(req, res) {
    var stripeToken = req.body.stripeToken;
    var amount = req.body.amount;
    stripe.charges.create(
      {
        card: stripeToken,
        currency: 'usd',
        amount: Number(amount),
      },
      function(err, charge) {
        if (err) {
          res.send(500, err);
        } else {
          res.send(200, charge);
        }
      }
    );
  });

  app.post('/home/settings/password', async function(req, res, next) {
    const username = req.body.username;
    const user = await User.updateUser(username, {
      password: req.body.password,
    });
    res.send(user);
  });

  app.post('/users/password_reset', function(req, res, next) {
    sendReq('POST', 'sessions/forgot_password', req, function(response, body) {
      res.send(response);
    });
  });

  app.post('/home/settings/email', function(req, res, next) {
    res.send('ok');
  });

  app.post('/home/settings/profile', async function(req, res, next) {
    const username = req.body.username;
    const user = await User.updateUser(username, { email: req.body.newEmail });
    res.send(user);
  });

  app.post('/home/settings/email', function(req, res, next) {
    sendReq(
      'POST',
      'users/' + req.body.username + '/send_verification',
      req,
      function(response, body) {
        res.send(response);
      }
    );
  });

  app.post('/users/new', async function(req, res, next) {
    const attrs = req.body;
    const user = await User.createUser(attrs);
    res.send(user);
  });

  app.post('/users/login', async function(req, res, next) {
    const attrs = req.body;
    const user = await User.verifyUser(attrs.username, attrs.password);
    res.send({ user });
  });

  app.post('/users/facebooklogin', facebookLogin);

  app.post('/stations', function(req, res, next) {
    req.headers.Authorization =
      'Basic ' + btoa('FreeVi:c56a71dd-f92e-4c22-8168-fb73f66a9cc3');
    sendReq(
      'GET',
      'scenes',
      req,
      function(response, body) {
        res.send(body);
      },
      'clara'
    );
  });

  app.post('/users', function(req, res, next) {
    req.headers.Authorization =
      'Basic ' + btoa('ziyang:b15bee73-119b-4df1-9c0c-81c581c528ca');
    sendReq('GET', 'users', req, function(response, body) {
      res.send(body);
    });
  });

  app.post('/users/notifications', function(req, res, next) {
    sendReq(
      req.body.method,
      'users/' + req.body.username + '/notifications',
      req,
      function(response, body) {
        res.send(body);
      }
    );
  });

  app.post('/users/message', function(req, res, next) {
    sendReq(
      req.body.method,
      'users/' + req.body.username + '/message',
      req,
      function(response, body) {
        res.send(body);
      }
    );
  });

  app.post('/users/preferences', function(req, res, next) {
    sendReq(
      req.body.method,
      'users/' + req.body.username + '/preferences',
      req,
      function(response, body) {
        res.send(body);
      }
    );
  });

  app.post('/users/transactions', async function(req, res, next) {
    var transactionType = req.body.type;
    if (transactionType === 'buying funds') {
      const update = await addViTouser(req);
      res.send(update);
    } else if (transactionType === 'model purchases') {
      const amount = req.body.amount;
      const purchaseItem = req.body.sceneId;
      const username = req.body.username;
      const user = await User.updateUser(username, {
        balance: '-' + amount,
        purchaseItem,
      });
      res.send(user);
    } else {
      const username = req.body.username;
      const user = await User.findUser(username);
      res.send(user);
    }
  });

  app.post('/users/scenes', async function(req, res, next) {
    const username = req.body.username;
    const scenes = await User.getUserScenes(username);
    res.send({ models: scenes });
  });

  app.post('/stations/new', async function(req, res, next) {
    var query =
      'name=' +
      req.body.name +
      '&visibility=' +
      req.body.visibility +
      '&description=' +
      req.body.description +
      '&tags[0]=freevi';
    sendReq(
      'POST',
      'scenes/' + req.body.sceneId + '/clone?' + encodeURIComponent(query),
      req,
      async function(response, body, error) {
        if (error) {
          console.log('Post scenes to clara failed');
          res.send(response);
        } else {
          var json = JSON.parse(body);
          const username = req.body.username;
          await User.updateUser(username, { scene: json._id });
          res.send(json);
        }
      },
      'clara'
    );
  });

  app.post('/stations/info', function(req, res, next) {
    sendReq(
      req.body.method,
      'scenes/' + req.body.sceneId,
      req,
      function(response, body) {
        res.send(response);
      },
      'clara'
    );
  });

  app.post('/users/info', function(req, res, next) {
    req.headers.Authorization =
      'Basic ' + btoa('Freevi:b15bee73-119b-4df1-9c0c-81c581c528ca');
    delete req.headers['set-cookie'];
    sendReq('GET', 'users/' + req.body.username, req, function(response, body) {
      res.send(body);
    });
  });

  app.post('/stations/comments', function(req, res, next) {
    sendReq(
      'GET',
      'scenes/' + req.body.sceneId + '/comments',
      req,
      function(response, body) {
        res.send(body);
      },
      'clara'
    );
  });

  app.post('/stations/comment', function(req, res, next) {
    sendReq(
      'POST',
      'scenes/' + req.body.sceneId + '/comments',
      req,
      function(response, body) {
        res.send(response);
      },
      'clara'
    );
  });

  app.post('/stations/collection', function(req, res, next) {
    sendReq(
      'GET',
      'collections/' + req.body.collection + '/scenes/',
      req,
      function(response, body) {
        res.send(response);
      },
      'clara'
    );
  });

  app.post('/users/collection', function(req, res, next) {
    sendReq(req.body.method, 'collections', req, function(response, body) {
      res.send(body);
    });
  });
  app.post('/stations/update', function(req, res, next) {
    sendReq(
      'PUT',
      'scenes/' + req.body.sceneId,
      req,
      function(response, body) {
        res.send(body);
      },
      'clara'
    );
  });
  app.post('/stations/delete', function(req, res, next) {
    sendReq(
      'DELETE',
      'scenes/' + req.body.sceneId,
      req,
      function(response, body) {
        res.send(response);
      },
      'clara'
    );
  });

  app.post('/stations/save', function(req, res, next) {
    sendReq(
      'PUT',
      'scenes/' + req.query.sceneId + '/published',
      req,
      function(response, body) {
        res.send(response);
      },
      'clara'
    );
  });

  app.post('/stations/like', function(req, res, next) {
    var option;
    if (req.body.like == 'true') {
      option = 'DELETE';
    } else option = 'POST';
    sendReq(
      option,
      'scenes/' + req.body.sceneId + '/like',
      req,
      function(response, body) {
        res.send(response);
      },
      'clara'
    );
  });
};

/**
 * Front-end middleware
 */
module.exports = (app, options) => {
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd) {
    addProdMiddlewares(app, options);
  } else {
    var webpackConfig = require('../../internals/webpack/webpack.dev.babel');
    addDevMiddlewares(app, webpackConfig);
  }

  return app;
};
