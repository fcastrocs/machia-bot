"use strict";

const Job = require("../models/job");

async function add(itemId, store, url) {
  let job = await get(itemId);

  if (job) {
    throw new Error("This job already exists.");
  }

  job = new Job({ itemId, store, url });
  await job.save();
}

async function get(itemId, store) {
  return await Job.findOne({ itemId, store }).exec();
}

async function getAll() {
  return await Job.find().exec();
}

async function has(itemId, store) {
  let job = await get(itemId, store);
  if (job) {
    return true;
  }
  return false;
}

async function remove(itemId, store) {
  return await Job.findOneAndDelete({ itemId, store }).exec();
}

function size() {
  return new Promise((resolve) => {
    Job.countDocuments((err, count) => {
      resolve(count);
    });
  });
}

module.exports = { add, get, has, remove, size, getAll };
