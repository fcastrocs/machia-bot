"use strict";

const Credential = require("../models/credential");

/**
 * Sets store credentials for this userId
 * data: [username, password, proxy, cardnumber, mmyy, cvv, cookies]
 */
async function set(userId, store, data) {
  let newData = new Object();
  console.log(data.length);

  // updating cookies
  if (data.length === 1) {
    newData.cookies = JSON.stringify(data[0]);
  } else {
    // new credential
    newData.email = data[0];
    newData.password = data[1];
    newData.proxy = data[2];
    newData.cookies = JSON.stringify(data[data.length - 1]);
  }

  // card number and exp not passed
  if (data.length === 5) {
    newData.cvv = data[3];
  }

  // card number and exp passed
  if (data.length === 7) {
    newData.cardNum = data[3];
    newData.exp = data[4];
    newData.cvv = data[5];
  }

  await Credential.findOneAndUpdate({ userId, store }, newData, {
    upsert: true,
    useFindAndModify: false,
  }).exec();
}

async function get(userId, store) {
  let doc = await Credential.findOne({ userId, store }).exec();
  if (!doc) return null;
  // don't return mongoose object
  return {
    userId: doc.userId,
    store: doc.store,
    email: doc.email,
    password: doc.password,
    proxy: doc.proxy,
    cookies: JSON.parse(doc.cookies),
    cvv: doc.cvv,
    cardNum: doc.cardNum,
    exp: doc.exp,
  };
}

async function has(userId, store) {
  let credential = await get(userId, store);
  if (credential) {
    return true;
  }
  return false;
}

async function remove(userId, store) {
  return await Credential.findOneAndDelete({
    userId: userId,
    store: store,
  }).exec();
}

module.exports = { set, get, has, remove };
