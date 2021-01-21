"use strict";

const Base = require("../base");
const retry = require("retry");

class Bhphotovideo extends Base {
  constructor(url, itemId, title) {
    super(url, "bhphotovideo", itemId, title);
  }

  start() {
    return this.startPurchases(this);
  }

  test(credential) {
    return super.test(this, credential);
  }

  waitButtonEnabled(page, selector) {
    var operation = retry.operation({
      retries: 10,
      minTimeout: 500,
      maxTimeout: 500,
    });

    return new Promise((resolve, reject) => {
      operation.attempt(async function () {
        let btn = await page.waitForSelector(selector, {
          visible: true,
        });

        let isDisabled = await page.$eval(selector, (button) => {
          return button.disabled;
        });

        if (isDisabled) {
          if (operation.retry(new Error("button is disabled"))) {
            return;
          }
          reject(new Error("button is disabled"));
        } else {
          resolve(btn);
        }
      });
    });
  }

  async purchase(credential) {
    let userId = credential.userId;
    let page = await this.launchBrowser(credential);

    // add to cart
    await this.addToCartHandle(credential, page);
    console.log(`${userId}: added to cart.`);

    // go to shopping cart
    await page.goto("https://www.bhphotovideo.com/find/cart.jsp", {
      waitUntil: "networkidle0",
    });
    console.log(`${userId}: opened cart.`);

    // click begin check out
    await page.waitForTimeout(2000);
    let btn = await page.waitForSelector("#loginCart", { visible: true });
    let box = await btn.boundingBox();

    let p = await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes("home?O=cart&A=cart&Q=update") || // not required
          res.url().includes("checkoutLogin=Y") // login required
      ),
      page.mouse.click(box.x, box.y, { delay: 500 }),
    ]);
    console.log(`${userId}: clicked checkout.`);

    // login
    if (p[0].url().includes("checkoutLogin=Y")) {
      console.log(`${userId}: logging in.`);
      await this.loginHandle(credential, page);
      console.log(`${userId}: logged in.`);
    }

    page.waitForNavigation();

    //wait for place order button
    await page.waitForSelector('button[data-selenium="placeOrder"]', {
      visible: true,
    });

    // check if it's disabled
    let isDisabled = await page.$eval(
      'button[data-selenium="placeOrder"]',
      (button) => {
        return button.disabled;
      }
    );

    // check if place button is disabled
    if (isDisabled) {
      // continue to payment
      await page.waitForTimeout(2500);
      btn = await page.waitForSelector(
        'button[data-selenium="continueFromShipping"]',
        { visible: true }
      );
      await btn.click({ delay: 500 });

      console.log(`${userId}: clicked continue to payment.`);

      // reenter card info
      btn = await page.waitForSelector('button[data-selenium="selectCard"]', {
        visible: true,
      });
      await btn.click({ delay: 500 });
      console.log(`${userId}: clicked select card.`);

      let element = await page.waitForSelector("#creditCardIframe");
      let iframe = await element.contentFrame();
      await iframe.type('input[name="ccNumber"]', credential.cardNum);
      let split = credential.exp.match(/.{2}/g);
      await iframe.click('select[name="ccExpMonth"]');
      await iframe.type('select[name="ccExpMonth"]', split[0]);
      await page.keyboard.press("Enter");
      await iframe.click('select[name="ccExpYear"]');
      await iframe.type('select[name="ccExpYear"]', split[1]);
      await page.keyboard.press("Enter");
      await iframe.type('input[name="ccCIDval"]', credential.cvv);
      await page.click('button[data-selenium="useThisCard"]');
      console.log(`${userId}: entered card info.`);

      //Review order
      btn = await this.waitButtonEnabled(
        page,
        'button[data-selenium="reviewOrderButton"]'
      );
      await page.waitForTimeout(2000);
      await btn.click({ delay: 500 });
      console.log(`${userId}: clicked review order`);
    }

    // Place order
    btn = await this.waitButtonEnabled(
      page,
      'button[data-selenium="placeOrder"]'
    );
    console.log(`${userId}: place order button is clickable.`);

    if (!this.testMode) {
      await btn.click({ delay: 500 });
      console.log(`${userId}: clicked place order.`);
      await page.waitForTimeout(10000);
      let cookies = await page.cookies();
      this.cookies.set(userId, cookies);
      return;
    }

    await this.emptyCart(credential, page);
    console.log(`${userId}: emptied cart.`);
    let cookies = await page.cookies();
    this.cookies.set(userId, cookies);
  }

  async addToCart(credential, page) {
    await page.goto(this.url, { waitUntil: "networkidle0" });

    await page.waitForTimeout(1000);

    let btn = await page.waitForSelector(
      "button[data-selenium='addToCartButton']",
      {
        visible: true,
      }
    );

    let p = await Promise.all([
      page.waitForResponse((res) => res.url().includes("api/cart")),
      btn.click({ delay: 500 }),
    ]);

    let res = await p[0].json();

    if (res.type !== "ok") {
      throw res;
    }
  }

  async emptyCart(credential, page) {
    await page.goto("https://www.bhphotovideo.com/find/cart.jsp");

    let btn = await page.waitForSelector(
      'span[data-selenium="remove-all-items"]',
      { visible: true }
    );
    await btn.click({ delay: 500 });

    btn = await page.waitForSelector('button[data-selenium="confirm-remove"]', {
      visible: true,
    });

    let p = await Promise.all([
      page.waitForResponse((res) =>
        res.url().includes("?Q=json&A=clearCart&O=")
      ),
      btn.click({ delay: 500 }),
    ]);

    try {
      var res = await p[0].json();
    } catch (e) {
      throw "Couldn't empty cart.";
    }

    if (res.status !== "success") {
      console.error(res);
      throw "Unexpecting error while emptying cart.";
    }
  }
}

module.exports = Bhphotovideo;
