"use strict";

const Base = require("../base");

class Newegg extends Base {
  constructor(url) {
    super(url, "newegg");
  }

  getData() {
    return super.getData(this);
  }

  parse($) {
    if ($("title").text() === "Are you a human?") {
      throw "Anti-bot system kicked in, try again later.";
    }

    // not a product page.
    if (
      $(".nosto_page_type").length === 0 ||
      $(".nosto_page_type").text() !== "product"
    ) {
      throw "Bad URL, try again.";
    }

    // not sold by newegg
    if (
      !$(".product-seller").text().includes("Sold by: NeweggShipped by Newegg")
    ) {
      throw "This product is not sold by Newegg.";
    }

    // Get item ID
    let itemId = $(".nosto_product > .product_id").text();
    if (!itemId) {
      throw "Could not get item id, try again.";
    }

    // Get product title
    let title = $(".nosto_product > .name").text();

    // product is available
    let outOfStock = false;
    if ($(".nosto_product > .availability").text() === "OutOfStock") {
      outOfStock = true;
    } else {
      outOfStock = false;
    }
    this.setValues(title, itemId, outOfStock);
  }
}

module.exports = Newegg;
