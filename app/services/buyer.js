"use strict";
const Buyer = require("../models/buyer");

async function add(userId, store, itemId) {
  let buyer = new Buyer({ userId, store, itemId });
  await buyer.save();
}

async function get(userId, store, itemId) {
  return await Buyer.findOne({ userId, store, itemId }).exec();
}

async function has(userId, store, itemId) {
  let buyer = await get(userId, store, itemId);
  if (buyer) return true;
  return false;
}

async function remove(userId, store, itemId) {
  return await Buyer.findOneAndDelete({
    userId,
    itemId,
    store,
  }).exec();
}

/**
 * Returns all docs with this store and itemId
 */
async function getItemBuyers(store, itemId) {
  return await Buyer.find({ store, itemId }).exec();
}

/**
 * Returns all docs with this userId and store
 */
async function getUserStore(userId, store) {
  return await Buyer.find({ userId, store }).exec();
}

function size() {
  return new Promise((resolve) => {
    Buyer.countDocuments((err, count) => {
      resolve(count);
    });
  });
}

module.exports = {
  add,
  get,
  has,
  remove,
  getItemBuyers,
  size,
  getUserStore,
};
