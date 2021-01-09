const fs = require("fs");
const Stores = JSON.parse(fs.readFileSync("./app/configs/stores.json"));

class Store {}

Store.has = (key) => {
  if (Stores[key]) return true;
  return false;
};

Store.getURL = (key) => {
  return Stores[key];
};

Store.list = () => {
  return Object.keys(Stores);
};

Store.urlToStore = (url) => {
  for (let key in Stores) {
    if (url.includes(Stores[key])) {
      return key;
    }
  }
  return null;
};

module.exports = Store;
