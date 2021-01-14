class AutoBuyer {
  constructor(url, store, itemId, title) {
    let storeClass = require(`./stores/${store}`);
    return new storeClass(url, itemId, title);
  }
}

module.exports = AutoBuyer;
