const StoreLogin = require("../modules/storelogin");
const Store = require("../modules/store");
const RateLimit = require("../modules/ratelimit");
const Credential = require("../services/credential");

const functions = new Object();

/**
 * Sets store credentials for this userId
 * data: [store, email, password, proxy, cardnumber, mmyy, cvv]
 */
functions.set = async function set(userId, data) {
  let store = data.shift();

  if (!Store.has(store)) {
    throw "Unsupported store.";
  }

  if (store === "bhphotovideo" && data.length !== 6) {
    throw "This store requires card number and expiration date.";
  }

  if (store !== "bhphotovideo" && data.length !== 4) {
    throw "This store doesn't require card number and expiration date.";
  }

  if (!validEmail(data[0])) {
    throw "Invalid email.";
  }

  if (!validProxy(data[2])) {
    throw "Invalid proxy.";
  }

  // card number and expiration passed
  if (data.length === 6) {
    if (!validCardNumber(data[3])) {
      throw "Invalid card number.";
    }

    if (!validCardExpDate(data[4])) {
      throw "Invalid card expiration date.";
    }
  }

  if (!validCVV(data[data.length - 1])) {
    throw "CVV must be 3 numbers.";
  }

  // try to login and store credential.
  let storeLogin = new StoreLogin(store);
  storeLogin.setUserData(userId, data[0], data[1], data[2]);
  await storeLogin.start();
  let cookies = storeLogin.getCookies();
  data.push(cookies);
  await Credential.set(userId, store, data);
};

functions.verify = async function verify(userId, [code]) {
  let storeLogin = new StoreLogin();
  storeLogin = storeLogin.getVerifyInstance(userId);
  await storeLogin.verify(code);
};

function validEmail(email) {
  const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(email);
}

function validCVV(cvv) {
  return /^[0-9]{3}$/.test(cvv);
}

function validCardNumber(num) {
  return /^[0-9]{16}$/.test(num);
}

function validCardExpDate(str) {
  // validate MMYY expiration date
  if (!/^[0-9]{4}$/.test(str)) return false;
  let split = str.match(/.{2}/g);
  let month = parseInt(split[0]);
  if (month < 1 || month > 12) return false;
  let year = parseInt(split[1]);
  let currYear = new Date().getFullYear().toString().substr(-2);
  if (year < currYear) return false;
  return true;
}

function validProxy(proxy) {
  if (!proxy) return false;
  let parts = proxy.split(":");
  if (parts.length !== 2) {
    return false;
  }

  let ip = parts[0];
  let port = parts[1];

  const ipRex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  if (!ipRex.test(ip)) return false;
  if (port < 1 || port > 65535) return false;
  return true;
}

module.exports = async (fn, userId, data) => {
  if (fn !== "set" && fn !== "verify") {
    throw "Unknown function";
  }

  if (RateLimit.has(userId)) {
    throw "There is an ongoing request...";
  }

  RateLimit.add(userId);

  try {
    await functions[fn](userId, data);
  } catch (e) {
    RateLimit.remove(userId);
    throw e;
  }

  RateLimit.remove(userId);
};
