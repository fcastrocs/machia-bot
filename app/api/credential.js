const StoreLogin = require("../modules/storelogin");
const Store = require("../modules/store");

async function set(userId, store, email, password, cvv) {
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
}

async function verify(userId, code) {
  let storeLogin = new StoreLogin(userId);
  await storeLogin.verify(code);
}

function validEmail(email) {
  const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(email);
}

function validCVV(cvv) {
  const re = /^[0-9]{3,4}$/;
  return re.test(cvv);
}

module.exports = { set, verify };
