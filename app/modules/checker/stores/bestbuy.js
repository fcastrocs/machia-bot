"use strict";

const Base = require("../base");

class Bestbuy extends Base {
  constructor(url) {
    // this is needed because proxies might not be from the US
    url += "?intl=nosplash";
    super(url, "bestbuy");
  }

  getData() {
    return super.getData(this);
  }

  parse($) {
    let type = $('meta[property="og:type"]').attr("content");
    if (type !== "product") {
      throw "This is not a product page.";
    }

    let itemId = $(".sku > .product-data-value").text().trim();
    let title = $(".sku-title > .heading-5").text().trim();

    let outOfStock = false;
    if ($(`button[data-sku-id="${itemId}"]`).text() === "Sold Out") {
      outOfStock = true;
    }

    this.setValues(title, itemId, outOfStock);
  }
}

module.exports = Bestbuy;
