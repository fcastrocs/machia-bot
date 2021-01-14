const Base = require("../base");

const ADD2CART_URL = "https://www.bestbuy.com/cart/api/v1/addToCart";

class Bestbuy extends Base {
  constructor(url, itemId, title) {
    super(url, "bestbuy", itemId, title);
  }

  start() {
    return this.startPurchases(this);
  }

  test(credential) {
    return super.test(this, credential);
  }

  async purchase(credential) {
    await this.addToCartHandle(credential.userId, credential.cookies);
    let page = await this.launchBrowser(credential.userId, credential.cookies);

    // go to shopping cart
    await page.goto("https://www.bestbuy.com/cart");

    // click check out
    let btn = await page.waitForSelector('button[data-track="Checkout - Top"]');
    await btn.click();

    //input cvv
    let input = await page.waitForSelector("#credit-card-cvv");
    await input.type(credential.cvv);

    //place order
    btn = await page.waitForSelector(
      'button[data-track="Place your Order - Contact Card"]'
    );

    if (!this.testMode) {
      await btn.click();
    }
  }

  async addToCart(cookies) {
    cookies = this.cookiesToString(cookies);

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
