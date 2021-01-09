"use strict";

const Credential = require("../models/credential");

async function set(userId, store, email, password, cvv, cookies) {
  await Credential.findOneAndUpdate(
    { userId, store },
    { email, password, cvv, cookies },
    { upsert: true, useFindAndModify: false }
  ).exec();
}

async function get(userId, store) {
  return await Credential.findOne({ userId, store }).exec();
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
