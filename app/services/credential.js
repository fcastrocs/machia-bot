"use strict";

const Credential = require("../models/credential");

async function set(userId, store, email, password, cvv, cookies, proxy) {
  await Credential.findOneAndUpdate(
    { userId, store },
    { email, password, cvv, cookies: JSON.stringify(cookies), proxy },
    { upsert: true, useFindAndModify: false }
  ).exec();
}

async function get(userId, store) {
  let doc = await Credential.findOne({ userId, store }).exec();
  if (!doc) return null;
  return new Object({
    userId: doc.userId,
    email: doc.email,
    password: doc.password,
    cvv: doc.cvv,
    cookies: JSON.parse(doc.cookies),
    proxy: doc.proxy,
  });
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
