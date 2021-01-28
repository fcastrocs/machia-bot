const fs = require("fs");
const Stores = JSON.parse(fs.readFileSync("./app/configs/stores.json"));

function has(key) {
  if (Stores[key]) return true;
  return false;
}

function getURL(key) {
  return Stores[key].url;
}

function list() {
  return Object.keys(Stores);
}

function urlToStore(url) {
  for (let key in Stores) {
    if (url.includes(Stores[key].url)) {
      return key;
    }
  }
  return null;
}

function isAutoBuyEnabled(store) {
  return Stores[store].autobuy;
}

module.exports = { has, getURL, list, urlToStore, isAutoBuyEnabled };
