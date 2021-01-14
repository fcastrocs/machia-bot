const Credential = require("../services/credential");
const Store = require("../modules/store");
const Checker = require("../modules/checker");
const RateLimit = require("../modules/ratelimit");
const AutoBuyer = require("../modules/autobuyer");

async function test(userId, url) {
  let store = Store.urlToStore(url);
  if (!store) {
    throw "Unsupported store.";
  }

  let credential = await Credential.get(userId, store);
  if (!credential) {
    throw "You don't have credentials for this store.";
  }

  let checker = new Checker(url, store);
  await checker.getData();

  if (!checker.isAvailable()) {
    throw "This product is out of stock.";
  }

  let autoBuyer = new AutoBuyer(url, store, checker.itemId, checker.title);
  await autoBuyer.test(credential);
}

module.exports = async (userId, url) => {
  if (RateLimit.has(userId)) {
    throw "There is an ongoing request...";
  }

  RateLimit.add(userId);

  try {
    await test(userId, url);
  } catch (e) {
    RateLimit.remove(userId);
    throw e;
  }

  RateLimit.remove(userId);
};
