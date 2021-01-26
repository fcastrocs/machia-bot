"use strict";

const Base = require("../base");

class Bestbuy extends Base {
  constructor(url) {
    let res = url.match(/(skuId=)([0-9]{7,8})$/);
    if (res.lenght !== 3) {
      throw "Bad URL.";
    }

    let skuid = res[2];
    url = `https://www.bestbuy.com/api/3.0/priceBlocks?skus=${skuid}`;

    super(url, "bestbuy");
  }

  getData() {
    return super.getData(this);
  }

  parse(data) {
    let obj = data[0].sku;

    if (obj.error) {
      throw "Bad skuid.";
    }

    let buttonState = obj.buttonState;

    let outOfStock = true;
    if (buttonState.displayText.toLowerCase() === "add to cart") {
      outOfStock = false;
    }

    let title = obj.names.short;
    let itemId = buttonState.skuId;

    this.setValues(title, itemId, outOfStock);
  }
}

module.exports = Bestbuy;
