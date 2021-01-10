const Base = require("../base");

const ADD2CART_URL = "https://www.bestbuy.com/cart/api/v1/addToCart";

class Bestbuy extends Base {
  constructor(url, itemId, title) {
    super(url, "bestbuy", itemId, title);
  }

  start() {
    return this.startPurchases(this);
  }

  async purchase(credential) {
    await this.addToCartHandle(credential.userId, credential.cookies);
    //let page = await this.launchBrowser(credential.userId, credential.cookies);

    // go to shopping cart
   // await page.goto("https://www.bestbuy.com/cart", {
      //waitUntil: "networkidle0",
   //});
  }

  async addToCart(cookies) {
    cookies = this.cookiesToString();

    let options = {
      url: ADD2CART_URL,
      cookies,
      data: { items: [{ skuId: this.itemId }] },
      origin: "https://www.bestbuy.com",
    };

    let res = await this.addToCartRequest(options);
    if (res.statusText !== "OK") {
      throw "Add to cart failed.";
    }

    if (!res.data.summaryItems) {
      throw "Add to cart failed.";
    }

    let found = false;
    for (let item of res.data.summaryItems) {
      if (item.skuId === this.itemId) {
        found = true;
        break;
      }
    }
    if (!found) {
      throw "Add to cart failed.";
    }
  }
}

module.exports = Bestbuy;
