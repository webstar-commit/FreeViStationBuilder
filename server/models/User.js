const db = require('./db');
const fetch = require('node-fetch');
const pwd = require('pwd');
const collectionName = 'freevi';
const apiRoot = 'https://clara.io/api';

async function createUser(attrs) {
  attrs.scenes = [];
  attrs.purchased = [];
  attrs.balance = 15000;
  attrs.createdAt = new Date();
  const collection = (await db).collection(collectionName);
  const user = await collection.findOne({ username: attrs.username });
  if (user)
    return {
      status: 422,
      message: 'username already taken',
    };
  const password = await pwd
    .hash(attrs.password)
    .then(({ salt, hash }) => 'pbkdf2' + '#' + salt + '#' + hash);
  attrs.password = password;
  const result = await collection.insertOne(attrs);
  return attrs;
}

async function updateUser(username, update) {
  const collection = (await db).collection(collectionName);
  const user = await collection.findOne({ username });
  if (!user) return null;
  if (update.scene) {
    user.scenes.unshift(update.scene);
  }
  if (update.password) {
    user.password = update.password;
  }
  if (update.email) {
    user.email = update.email;
  }
  if (update.balance) {
    user.balance = Number(user.balance) + Number(update.balance);
  }
  if (update.purchaseItem) {
    if (!user.purchased) {
      user.purchased = [update.purchaseItem];
    } else {
      user.purchased.unshift(update.purchaseItem);
    }
  }
  const updated = await collection.findOneAndUpdate({ username }, user, {
    returnNewDocument: true,
  });
  return updated;
}

async function verifyUser(username, password) {
  const collection = (await db).collection(collectionName);
  const user = await collection.findOne({ username });
  if (!user) return null;
  const [algo, salt, hashed] = user.password.split('#');
  const passwordMatch = await pwd
    .hash(password, salt)
    .then(({ hash }) => hash === hashed);
  if (passwordMatch) return user;
  return null;
  //  return password === user.password ? user : null;
}

async function getUserScenes(username) {
  const collection = (await db).collection(collectionName);
  const user = await collection.findOne({ username });
  if (!user) return [];
  const freeviScenes = await Promise.all(
    user.scenes.map(
      async id =>
        await fetch(`${apiRoot}/scenes/${id}`).then(async res => {
          if (res.status === 200) return await res.json();
          return null;
        })
    )
  );
  return freeviScenes;
}

async function findUser(username, query) {
  const collection = (await db).collection(collectionName);
  const search = username ? { username } : query;
  const user = await collection.findOne(search);
  return user;
}

function checkBalance(username, callback) {}

function handleTransaction(username, trans, callback) {}

module.exports = {
  createUser,
  updateUser,
  findUser,
  checkBalance,
  handleTransaction,
  verifyUser,
  getUserScenes,
};
