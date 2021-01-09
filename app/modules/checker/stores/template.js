"use strict";

const Base = require("../base");

class Store extends Base {
  constructor(url) {
    super(url, "store");
  }

  getData() {
    return super.getData(this);
  }

  parse($) {
    if ($("title").text() === "Are you a human?") {
      throw "Anti-bot system kicked in, try again later.";
    }
    //this.setValues(title, itemId, outOfStock);
  }
}

module.exports = Store;
