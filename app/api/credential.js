const StoreLogin = require("../modules/storelogin");
const Store = require("../modules/store");
const RateLimit = require("../modules/ratelimit");

const functions = new Object();

functions.set = async function set(userId, store, email, password, cvv) {
  if (!validEmail(email)) {
    throw "Invalid email.";
  }

  if (!validCVV(cvv)) {
    throw "CVV must be 3 numbers.";
  }

  if (!Store.has(store)) {
    throw "Unsupported store.";
  }

  let storeLogin = new StoreLogin(userId, store, email, password, cvv);
  await storeLogin.start();
};

functions.verify = async function verify(userId, code) {
  let storeLogin = new StoreLogin(userId);
  await storeLogin.verify(code);
};

function validEmail(email) {
  const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(email);
}

function validCVV(cvv) {
  const re = /^[0-9]{3,4}$/;
  return re.test(cvv);
}

module.exports = async (fn, userId, args) => {
  if (fn !== "set" && fn !== "verify") {
    throw "Unknown function";
  }

  if (RateLimit.has(userId)) {
    throw "There is an ongoing request...";
  }

  RateLimit.add(userId);

  try {
    await functions[fn](userId, ...args);
  } catch (e) {
    RateLimit.remove(userId);
    throw e;
  }

  RateLimit.remove(userId);
};
