const Verification = require("../../services/verification");

module.exports = class StoreLogin {
  constructor(userId, store, email, password, cvv, page) {
    // Autobuyer sends page for login requests
    // don't check if autobuyer sent login verification
    if (!page && Verification.has(userId)) {
      return Verification.get(userId);
    }

    if (!store || !email || !password || !cvv) {
      throw "Invalid requests.";
    }

    let storeClass = require(`./stores/${store}`);
    return new storeClass(userId, email, password, cvv, page);
  }
};
