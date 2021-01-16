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
    let cookies = JSON.parse(credential.cookies);

    let lineId = await this.addToCartHandle(credential.userId, cookies);
    let page = await this.launchBrowser(credential.userId, cookies);

    // go to shopping cart
    await page.goto("https://www.bestbuy.com/cart");

    // click check out
    let btn = await page.waitForSelector(
      'button[data-track="Checkout - Top"]',
      { visible: true }
    );

    // check whether signin is required
    let p = await Promise.all([
      page.waitForResponse((res) => res.url().includes("identity/signin")),
      btn.click(),
    ]);

    // need to signin
    if (p[0].status() !== 302) {
      await this.loginHandle(credential, page);
      await page.waitForTimeout(2000);
    }

    //input cvv
    let input = await page.waitForSelector("#credit-card-cvv", {
      visible: true,
    });
    await input.type(credential.cvv);

    //place order
    btn = await page.waitForSelector(
      'button[data-track="Place your Order - Contact Card"]'
    );

    if (!this.testMode) {
      await btn.click();
      await page.waitForTimeout(10000);
    }

    await this.removeItemFromCart(cookies, lineId);
  }

  async addToCart(cookies) {
    cookies = this.cookiesToString(cookies);

    let options = {
      url: ADD2CART_URL,
      method: "post",
      cookies,
      data: { items: [{ skuId: this.itemId }] },
      origin: "https://www.bestbuy.com",
    };

    let res = await this.httpRequest(options);
    if (res.statusText !== "OK") {
      throw "Add to cart failed.";
    }

    if (!res.data.summaryItems) {
      throw "Add to cart failed.";
    }

    for (let item of res.data.summaryItems) {
      if (item.skuId === this.itemId) {
        return item.lineId;
      }
    }

    throw "Add to cart failed.";
  }

  async removeItemFromCart(cookies, lineId) {
    let options = {
      url: `https://www.bestbuy.com/cart/item/${lineId}`,
      origin: "https://www.bestbuy.com",
      method: "delete",
      cookies: this.cookiesToString(cookies),
    };

    await this.httpRequest(options);
  }
}

module.exports = Bestbuy;
