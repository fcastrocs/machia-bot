const Base = require("../base");
const retry = require("retry");

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
    let userId = credential.userId;

    // adding to cart
    console.log(`${userId}: adding to cart.`);
    let page = await this.launchBrowser(credential);
    let lineId = await this.addToCartHandle(credential, page);

    // opening cart
    console.log(`${userId}: opening cart.`);
    await page.goto("https://www.bestbuy.com/cart");

    // click check out
    console.log(`${userId}: going to checkout.`);
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
      console.log(`${userId}: logging in.`);
      await this.loginHandle(credential, page);
    }

    //input cvv
    console.log(`${userId}: entering cvv.`);
    let input = await page.waitForSelector("#credit-card-cvv", {
      visible: true,
    });
    await input.type(credential.cvv);

    //place order
    console.log(`${userId}: placing order.`);
    btn = await page.waitForSelector(
      'button[data-track="Place your Order - Contact Card"]',
      { visible: true }
    );

    if (!this.testMode) {
      await btn.click();
      await page.waitForTimeout(10000);
      let cookies = await page.cookies();
      this.cookies.set(userId, cookies);
      return;
    }

    console.log(`${userId}: emptying cart.`);
    await this.removeItemFromCart(credential, lineId);
    let cookies = await page.cookies();
    this.cookies.set(userId, cookies);
  }

  async addToCart(credential, page) {
    await page.goto(this.url);

    let btn = await page.waitForSelector('button[data-sku-id="6318342"]', {
      visible: true,
    });

    let isDisabled = await page.$eval(
      'button[data-sku-id="6318342"]',
      (button) => {
        return button.disabled;
      }
    );

    if (isDisabled) {
      throw "Add to cart failed, button is disabled.";
    }

    await btn.click();
    await page.waitForTimeout(3000);
    await this.waitButtonEnabled(page, 'button[data-sku-id="6318342"]');
    btn = await page.waitForSelector('button[data-sku-id="6318342"]', {
      visible: true,
    });
    await btn.click();
  }

  waitButtonEnabled(page, selector) {
    var operation = retry.operation({
      retries: 2000,
      minTimeout: 500,
      maxTimeout: 500,
    });

    return new Promise((resolve, reject) => {
      operation.attempt(async function () {
        let isDisabled = await page.$eval(selector, (button) => {
          return button.disabled;
        });

        if (isDisabled) {
          if (operation.retry(new Error("button is disabled"))) {
            return;
          }
          reject(new Error("button is disabled"));
        } else {
          resolve();
        }
      });
    });
  }

  async removeItemFromCart(credential, lineId) {
    let options = {
      url: `https://www.bestbuy.com/cart/item/${lineId}`,
      origin: "https://www.bestbuy.com",
      method: "delete",
      cookies: this.cookiesToString(credential.cookies),
      proxy: credential.proxy,
    };

    await this.httpRequest(options);
  }
}

module.exports = Bestbuy;
