const Base = require("../base");

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

  async purchase(credential) {
    let page = await this.launchBrowser(credential);
    await this.addToCartHandle(credential, page);

    // go to shopping cart
    await page.goto("https://www.bhphotovideo.com/find/cart.jsp", {
      waitUntil: "networkidle0",
    });

    await page.waitForTimeout(1000);

    // click check out
    let btn = await page.waitForSelector("#loginCart", { visible: true });

    let p = await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes("home?O=cart&A=cart&Q=update") || // not required
          res.url().includes("checkoutLogin=Y") // login required
      ),
      btn.click(),
    ]);

    let html = await p[0].text();

    // need to login
    if (html.includes("loginFormLayer")) {
      console.log("Signing in...");
      await this.loginHandle(credential, page);
    }

    await page.waitForTimeout(3500);

    //place order
    btn = await page.waitForSelector('button[data-selenium="placeOrder"]', {
      visible: true,
    });

    if (!this.testMode) {
      await btn.click();
      await page.waitForTimeout(10000);
      let cookies = await page.cookies();
      this.cookies.set(credential.userId, cookies);
      return;
    }
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
      btn.click(),
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
    await btn.click();

    btn = await page.waitForSelector('button[data-selenium="confirm-remove"]', {
      visible: true,
    });

    let p = await Promise.all([
      page.waitForResponse((res) =>
        res.url().includes("?Q=json&A=clearCart&O=")
      ),
      btn.click(),
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
