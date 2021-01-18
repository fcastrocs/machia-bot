module.exports = class StoreLogin {
  constructor(store) {
    // No store is passed when verifying a login
    if (!store) {
      return new (require("./base"))();
    }

    let storeClass = require(`./stores/${store}`);
    return new storeClass();
  }
};
