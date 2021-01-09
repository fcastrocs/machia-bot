"use strict";
const UserItem = require("../models/userItem");

async function add(userId, itemId, store, url) {
  let userItem = new UserItem({ userId, itemId, store, url });
  await userItem.save();
}

async function get(userId, itemId, store) {
  return await UserItem.findOne({ userId, itemId, store }).exec();
}

async function has(userId, itemId, store) {
  let userItem = await get(userId, itemId, store);
  if (userItem) {
    return true;
  }
  return false;
}

async function remove(userId, itemId, store) {
  return await UserItem.findOneAndDelete({
    userId,
    itemId,
    store,
  }).exec();
}

/**
 * getAll(userId, store) returns docs with this userId and store
 * getAll(null, store, itemId) returns all docs with this store and item
 */
async function getAll(userId, store, itemId) {
  if (userId && store && !itemId) {
    return await UserItem.find({ userId, store }).exec();
  }

  if (!userId && store && itemId) {
    return await UserItem.find({ store, itemId }).exec();
  }

  throw new Error("Incorrect number of arguments passed.");
}

function size() {
  return new Promise((resolve) => {
    UserItem.countDocuments((err, count) => {
      resolve(count);
    });
  });
}

module.exports = { add, get, has, remove, getAll, size };
