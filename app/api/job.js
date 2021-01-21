const Job = require("../services/job");
const Credential = require("../services/credential");
const UserItem = require("../services/userItem");
const Store = require("../modules/store");
const Checker = require("../modules/checker");
const CheckerService = require("../services/checker");
const RateLimit = require("../modules/ratelimit");

const functions = new Object();

/**
 * Restore all jobs
 */
functions.restore = async function restore() {
  if ((await Job.size()) == 0) {
    return;
  }

  let promises = [];

  let jobs = await Job.getAll();

  for (let job of jobs) {
    promises.push(
      new Promise((resolve) => {
        (async function retry() {
          try {
            await functions.start(null, job.url);
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
functions.start = async function start(userId, url) {
  let store = Store.urlToStore(url);

  if (!store) {
    throw "Unsupported store.";
  }

  // User doesn't have credentials for this store
  if (userId && !(await Credential.has(userId, store))) {
    throw "You don't have credentials for this store.";
  }

  let checker = new Checker(url, store);
  await checker.getData();

  if (checker.isAvailable()) {
    throw "This product is already available.";
  }

  // Check if this url has a checker
  if (userId && checker.isDuplicate()) {
    if (await UserItem.has(userId, checker.itemId, store)) {
      throw "You already have this product on auto-buy.";
    }
    await UserItem.add(userId, checker.itemId, store, url, checker.title);
    return;
  }

  checker.start();

  if (userId) {
    await Job.add(checker.itemId, store, url);
    await UserItem.add(userId, checker.itemId, store, url, checker.title);
  }
};

/**
 * stops a running job
 */
functions.stop = async function stop(userId, store, itemId) {
  if (!Store.has(store)) {
    throw "Unsupported store.";
  }

  if (!(await Job.has(itemId, store))) {
    throw "I am not tracking this item.";
  }

  if (!CheckerService.has(store, itemId)) {
    throw "Checker doesn't exist.";
  }

  if (!(await UserItem.has(userId, itemId, store))) {
    throw "You are not tracking this item.";
  }

  // other users still want to buy this item
  if ((await UserItem.getAll(null, store, itemId)).length > 1) {
    await UserItem.remove(userId, itemId, store);
    return;
  }

  // no one else wants to buy this item
  await Job.remove(itemId, store);
  await UserItem.remove(userId, itemId, store);
  let checker = CheckerService.remove(store, itemId);
  checker.stop();
};

/**
 * Returns all running jobs
 */
functions.list = async function list() {
  let map = new Map();

  let docs = await Job.getAll();
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

  let docs = await UserItem.getAll(userId, store);

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
