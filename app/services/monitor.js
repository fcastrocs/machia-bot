"use strict";

const Monitor = require("../models/monitor");
const MonitorMap = new Map();

/**
 * Stores monitor to DB and to local Map
 */
async function add(store, itemId, url, title, monitorInstance) {
  // save to DB
  if (!monitorInstance) {
    let monitor = await get("db", store, itemId);
    if (monitor) throw new Error("This job already exists.");
    monitor = new Monitor({ itemId, store, url, title });
    await monitor.save();
  } else {
    // save to Map
    let map = MonitorMap.get(store);
    if (!map) {
      map = new Map();
      MonitorMap.set(store, map);
    }
    if (map.has(itemId)) {
      throw "This monitor instance already exists.";
    }
    map.set(itemId, monitorInstance);
  }
}

/**
 * Get monitor db doc or checker instance from Map
 */
async function get(type, store, itemId) {
  if (type === "db") {
    return await Monitor.findOne({ itemId, store }).exec();
  }

  if (type === "map") {
    let map = MonitorMap.get(store);
    if (!map) return null;
    return map.get(itemId);
  }
}

/**
 * returns whether checker exists
 * @returns boolean
 */
async function has(type, store, itemId) {
  if (type === "db") {
    let monitor = await get("db", store, itemId);
    if (monitor) return true;
    return false;
  }

  if (type === "map") {
    let map = MonitorMap.get(store);
    if (!map) return false;
    return map.has(itemId);
  }
}

/**
 * Remove checker from DB and from Map
 * @returns monitor instance
 */
async function remove(store, itemId) {
  await Monitor.findOneAndDelete({ itemId, store }).exec();

  let map = MonitorMap.get(store);
  let monitor = map.get(itemId);
  map.delete(itemId);
  return monitor;
}

/**
 * Count monitor documents
 */
function size() {
  return new Promise((resolve) => {
    Monitor.countDocuments((err, count) => {
      resolve(count);
    });
  });
}

/**
 * Get all monitor documents
 */
async function getAll() {
  return await Monitor.find().exec();
}

module.exports = { add, get, has, remove, size, getAll };
