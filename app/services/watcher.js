"use strict";
const Watcher = require("../models/watcher");

async function add(userId, store, itemId) {
  let buyer = new Watcher({ userId, store, itemId });
  await buyer.save();
}

async function get(userId, store, itemId) {
  return await Watcher.findOne({ userId, store, itemId }).exec();
}

async function has(userId, store, itemId) {
  let buyer = await get(userId, store, itemId);
  if (buyer) return true;
  return false;
}

async function remove(userId, store, itemId) {
  return await Watcher.findOneAndDelete({
    userId,
    itemId,
    store,
  }).exec();
}

/**
 * Returns all docs with this store and itemId
 */
async function getItemWatchers(store, itemId) {
  return await Watcher.find({ store, itemId }).exec();
}

/**
 * Remove all documents with this store and itemId
 */
async function removeItemWatchers(store, itemId) {
  await Watcher.deleteMany({ store, itemId }).exec();
}

/**
 * Returns all docs with this userId and store
 */
async function getUserStore(userId, store) {
  return await Watcher.find({ userId, store }).exec();
}

function size() {
  return new Promise((resolve) => {
    Watcher.countDocuments((err, count) => {
      resolve(count);
    });
  });
}

module.exports = {
  add,
  get,
  has,
  remove,
  getItemWatchers,
  size,
  getUserStore,
  removeItemWatchers,
};
