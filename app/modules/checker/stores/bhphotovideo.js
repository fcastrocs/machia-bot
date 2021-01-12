"use strict";

const Base = require("../base");

class Bhphotovideo extends Base {
  constructor(url) {
    if (!url.includes("https://www.bhphotovideo.com/c/product")) {
      throw "This is not a product page.";
    }

    super(url, "bhphotovideo");

    [this.itemId] = url.match(/[0-9]{7,8}-REG/);
    if (!this.itemId) {
      throw "This is not a product page.";
    }
    this.itemId = this.itemId.replace("-REG", "");
  }

  getData() {
    return super.getData(this);
  }

  parse($) {
    if (!$('meta[property="og:title"]').length) {
      throw "Could not get title.";
    }

    let title = $('meta[property="og:title"]').attr("content");

    let outOfStock = false;

    // presence of this button indicates product is available
    if ($('button[data-selenium="addToCartButton"]').length) {
      return this.setValues(title, this.itemId, outOfStock);
    }

    if (
      $('button[data-selenium="notifyAvailabilityButton"]').text() ===
      "Notify When Available"
    ) {
      outOfStock = true;
    }

    this.setValues(title, this.itemId, outOfStock);
  }
}

module.exports = Bhphotovideo;
