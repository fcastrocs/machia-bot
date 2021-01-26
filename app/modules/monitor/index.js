class Monitor {
  constructor(url, store) {
    let storeClass = require(`./stores/${store}`);
    return new storeClass(url);
  }
}

module.exports = Monitor;
