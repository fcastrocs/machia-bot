const Base = require("../base");

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
    let lineId = await this.addToCartHandle(credential);
    let page = await this.launchBrowser(credential);

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
      return;
    }

    await this.removeItemFromCart(credential, lineId);
  }

  async addToCart(credential) {
    let cookies = this.cookiesToString(credential.cookies);

    let options = {
      url: "https://www.bestbuy.com/cart/api/v1/addToCart",
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

  async removeItemFromCart(credential, lineId) {
    let options = {
      url: `https://www.bestbuy.com/cart/item/${lineId}`,
      origin: "https://www.bestbuy.com",
      method: "delete",
      cookies: this.cookiesToString(credential.cookies),
    };

    await this.httpRequest(options);
  }
}

module.exports = Bestbuy;
