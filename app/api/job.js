const Credential = require("../services/credential");
const Buyer = require("../services/buyer");
const Watcher = require("../services/watcher");
const MonitorService = require("../services/monitor");

const Store = require("../modules/store");
const Monitor = require("../modules/monitor");
const RateLimit = require("../modules/ratelimit");

const functions = new Object();

/**
 * Restore jobs on start
 */
functions.restore = async function restore() {
  if ((await MonitorService.size()) == 0) {
    return;
  }

  let promises = [];

  let jobs = await MonitorService.getAll();

  for (let job of jobs) {
    promises.push(
      new Promise((resolve) => {
        (async function retry() {
          try {
            await functions.start(null, null, job.url);
            resolve();
          } catch (e) {
            return retry();
          }
        })();
      })
    );
  }

  await Promise.allSettled(promises);
};

/**
 * starts a job
 */
functions.start = async function start(userId, autobuy, url) {
  let store = Store.urlToStore(url);

  if (!store) {
    throw "Unsupported store.";
  }

  if (autobuy && !Store.isAutoBuyEnabled(store)) {
    throw "This store does not support auto-buy.";
  }

  if (userId && autobuy && !(await Credential.has(userId, store))) {
    // User doesn't have credentials for this store
    throw "You don't have credentials for this store.";
  }

  let monitor = new Monitor(url, store);
  let data = await monitor.getData();

  if (monitor.isAvailable()) {
    throw "This product is already available.";
  }

  // duplicate monitor
  if (userId && (await monitor.isDuplicate())) {
    let isBuying = await Buyer.has(userId, store, data.itemId);
    if (isBuying) {
      throw "You are already auto-buying this item.";
    }

    let isWatching = await Watcher.has(userId, store, data.itemId);
    if (isWatching) {
      throw "You are already watching this item.";
    }

    if (autobuy) {
      await Buyer.add(userId, store, data.itemId);
    } else {
      await Watcher.add(userId, store, data.itemId);
    }
    return;
  }

  // start monitor
  monitor.start();

  // Store monitor to map
  MonitorService.add(store, data.itemId, null, null, monitor);

  if (userId) {
    // store monitor to DB
    await MonitorService.add(store, data.itemId, url, data.title);
    // store autobuy
    if (autobuy) {
      await Buyer.add(userId, store, data.itemId);
    } else {
      await Watcher.add(userId, store, data.itemId);
    }
  }
};

/**
 * stops a running job
 */
functions.stop = async function stop(userId, store, itemId) {
  if (!Store.has(store)) {
    throw "Unsupported store.";
  }

  if (!MonitorService.has("map", store, itemId)) {
    throw "Monitor doesn't exist.";
  }

  let isBuying = await Buyer.has(userId, store, itemId);
  let isWatching = await Watcher.has(userId, store, itemId);

  if (!isBuying && !isWatching) {
    throw "You are not auto-buying or watching this item.";
  }

  let watchingCount = await Watcher.getItemWatchers(store, itemId);
  let buyingCount = await Buyer.getItemBuyers(store, itemId);
  let total = watchingCount.length + buyingCount.length;

  if (isBuying) return await Buyer.remove(userId, store, itemId);
  if (isWatching) return await Watcher.remove(userId, store, itemId);

  // more people want to buy or watch this item
  if (total > 1) {
    return;
  }

  // nobody else is buying or watching this item
  let checker = await MonitorService.remove(store, itemId);
  checker.stop();
};

/**
 * Returns all running jobs
 */
functions.list = async function list() {
  let map = new Map();

  let docs = await MonitorService.getAll();
  if (docs.length === 0) return null;

  for (let doc of docs) {
    let obj = {
      itemId: doc.itemId,
      url: doc.url,
    };

    let array = map.get(doc.store);
    if (!array) {
      array = new Array();
      map.set(doc.store, array);
    }

    array.push(obj);
  }
  return map;
};

/**
 * Returns store list for this userId
 */
functions.myList = async function myList(userId, store) {
  let array = [];

  let docs = await Buyer.getUserStore(userId, store);

  for (let doc of docs) {
    let obj = {
      itemId: doc.itemId,
      title: doc.title,
      url: doc.url,
    };

    array.push(obj);
  }
  return array;
};

module.exports = async (fn, userId, args) => {
  //skip restore
  if (fn === "restore") {
    return await functions.restore();
  }

  if (fn !== "start" && fn !== "stop" && fn !== "list" && fn !== "myList") {
    throw "Unknown function";
  }

  if (RateLimit.has(userId)) {
    throw "There is an ongoing request...";
  }

  RateLimit.add(userId);

  try {
    var res = await functions[fn](userId, ...args);
  } catch (e) {
    RateLimit.remove(userId);
    throw e;
  }
  RateLimit.remove(userId);
  return res;
};
