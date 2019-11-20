const mysql = require('mysql');

/*
const mongodb = require('mongodb');

const mongoUrl = `mongodb://${process.env.MONGO_HOST ||
  'localhost'}:27017/${process.env.MONGO_DATABASE || 'clients'}`;

const db = new Promise((resolve, reject) => {
  mongodb.MongoClient.connect(mongoUrl)
    .then(connection => {
      resolve(connection);
      console.log('Connected to', mongoUrl);
    })
    .catch(err => {
      console.log('connection Mongo error ');
      console.log(err);
    });
});
*/
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'videv',
});

db.connect((err) => {
  if (err) {
      throw err;
  }
  console.log('Connected to database');
});

module.exports = db;
