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
    console.log(`${userId}: adding to cart itemId ${this.itemId}`);
    let page = await this.launchBrowser(credential);
    await this.addToCartHandle(credential, page);

    // opening cart
    console.log(`${userId}: opening cart.`);
    await page.goto("https://www.bestbuy.com/cart");
    await page.waitForTimeout(3000);

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
      let context = page.context();
      let cookies = await context.cookies();
      this.cookies.set(userId, cookies);
      return;
    }

    console.log(`${userId}: emptying cart.`);
    await this.removeItemFromCart(page);
    let context = page.context();
    let cookies = await context.cookies();
    this.cookies.set(userId, cookies);
    await page.waitForTimeout(5000);
  }

  async addToCart(credential, page) {
    await page.goto(this.url.replace("?intl=nosplash", ""));
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: "./screenshot.jpg",
      type: "jpeg",
      fullPage: true,
    });

    // get add to cart button
    let btn = await page.waitForSelector(
      `button[data-sku-id="${this.itemId}"]`,
      {
        visible: true,
        timeout: 3000,
      }
    );

    let isDisabled = await page.$eval(
      `button[data-sku-id="${this.itemId}"]`,
      (button) => {
        return button.disabled;
      }
    );

    let text = await page.$eval(
      `button[data-sku-id="${this.itemId}"]`,
      (button) => {
        return button.textContent;
      }
    );

    // item is sold out
    if (isDisabled && text.includes("Sold Out")) {
      throw "Add to cart failed, item sold out.";
    }

    // add to cart
    if (!isDisabled && text.includes("Add to Cart")) {
      await btn.click();
      console.log(
        `${credential.userId}: clicked add to cart itemId ${this.itemId}.`
      );
      await page.waitForTimeout(3000);
    }

    // get button properties again, because button was clicked
    isDisabled = await page.$eval(
      `button[data-sku-id="${this.itemId}"]`,
      (button) => {
        return button.disabled;
      }
    );

    text = await page.$eval(
      `button[data-sku-id="${this.itemId}"]`,
      (button) => {
        return button.textContent;
      }
    );

    // Placed on queue system, wait to be re-enabled
    if (isDisabled && text.includes("Please Wait")) {
      console.log(
        `${credential.userId}: placed on queue, waiting, itemId ${this.itemId}...`
      );
      await this.waitButtonEnabled(page, 'button[data-sku-id="6318342"]');
      btn = await page.waitForSelector('button[data-sku-id="6318342"]', {
        visible: true,
      });
      console.log(
        `${credential.userId}: released from queue, itemId ${this.itemId}.`
      );
      await btn.click();
      console.log(
        `${credential.userId}: clicked add to cart again, itemId ${this.itemId}.`
      );
      await page.waitForTimeout(3000);
    } else if (isDisabled && text.includes("Sold Out")) {
      // item is sold out
      throw "Add to cart failed, item sold out.";
    }

    // released from queue or item doesn't use queue system, wait for modal to say "added to cart"
    await page.waitForSelector(".added-to-cart", { visible: true });
    console.log(
      `${credential.userId}: successfully added to cart, itemId ${this.itemId}.`
    );
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

  async removeItemFromCart(page) {
    await page.goto("https://www.bestbuy.com/cart");
    let selector = `section[auto-test-sku="${this.itemId}"] .fluid-item__actions > a[title="Remove"]`;
    let btn = await page.waitForSelector(selector, { visible: true });
    await btn.click();
  }
}

module.exports = Bestbuy;
