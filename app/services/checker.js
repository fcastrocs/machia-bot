/**
 * Map<itemID, Checker instance>
 */

"use strict";

class Checker {}
Checker.map = new Map();

/**
 * Adds checker instance, avoids duplicates.
 */
Checker.add = (store, itemId, checker) => {
  let map = Checker.get(store);
  if (!map) {
    map = new Map();
    Checker.map.set(store, map);
  }

  if (map.has(itemId)) {
    return;
  }

  map.set(itemId, checker);
};

/**
 * get(store, itemId) returns checker instance for this itemId
 */
Checker.get = (store, itemId) => {
  let map = Checker.map.get(store);

  if (store && itemId) {
    if (!map) return null;
    return map.get(itemId);
  }

  if (store && !itemId) {
    return map;
  }
};

/**
 * returns whether checker exists
 * @returns boolean
 */
Checker.has = (store, itemId) => {
  let map = Checker.get(store);
  if (!map) return false;
  return map.has(itemId);
};

/**
 * Remove checker for this store's itemId
 * @Returns checker instance
 */
Checker.remove = (store, itemId) => {
  let map = Checker.get(store);
  if (!map) return null;

  let checker = map.get(itemId);
  map.delete(itemId);
  return checker;
};

module.exports = Checker;
