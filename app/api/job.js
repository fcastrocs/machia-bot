const Job = require("../services/job");
const Credential = require("../services/credential");
const UserItem = require("../services/userItem");
const Store = require("../modules/store");
const Checker = require("../modules/checker");

/**
 * Restore all jobs
 */
async function restore() {
  if ((await Job.size()) == 0) {
    return;
  }

  let timeout = 0;
  let promises = [];

  let jobs = await Job.getAll();

  for (let job of jobs) {
    promises.push(
      new Promise((resolve, reject) => {
        setTimeout(async () => {
          try {
            await start(null, job.url);
            resolve();
          } catch (error) {
            await Job.remove(job.itemId);
            console.error(error);
            reject();
          }
        }, timeout);
        timeout += 1000;
      })
    );
  }

  await Promise.allSettled(promises);
}

/**
 * starts a job, throws if fails
 * @returns checker's instance
 */
async function start(userId, url) {
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
    throw "This product is not out of stock.";
  }

  // Check if this url has a checker
  if (userId && checker.isDuplicate()) {
    if (await UserItem.has(userId, checker.itemId, store)) {
      throw "You already have this product on auto-buy.";
    }
    await UserItem.add(userId, checker.itemId, store, url);
    return;
  }

  checker.start();

  if (userId) {
    await Job.add(checker.itemId, store, url);
    await UserItem.add(userId, checker.itemId, store, url);
  }
}

/**
 * stops a running job, throws if fails
 */
async function stop(userId, store, itemId) {
  if (!Store.has(store)) {
    throw "Unsupported store.";
  }

  if (!(await Job.has(itemId, store))) {
    throw "I am not tracking this item.";
  }

  if (!Checker.has(store, itemId)) {
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
  let checker = Checker.remove(store, itemId);
  checker.clearInterval();
}

/**
 * Returns all running jobs
 */
async function list() {
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
}

module.exports = { restore, start, stop, list };
