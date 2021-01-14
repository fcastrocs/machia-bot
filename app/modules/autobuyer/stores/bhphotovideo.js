const Base = require("../base");

class Bhphotovideo extends Base {
  constructor(url, itemId, title) {
    super(url, "bhphotovideo", itemId, title);
  }

  start() {
    return this.startPurchases(this);
  }

  async purchase(credential) {
    let page = await this.launchBrowser(credential.userId, credential.cookies);
    await this.addToCartHandle(credential.userId, credential.cookies, page);

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
          res.url().includes("home?O=cart&A=cart&Q=update") ||
          res.url().includes("checkoutLogin=Y")
      ),
      btn.click(),
    ]);

    let html = await p[0].text();

    // need to login
    if (html.includes("user-input")) {
      await this.loginHandle(credential, page);
    }

    await page.waitForTimeout(3500);

    //place order
    btn = await page.waitForSelector('button[data-selenium="placeOrder"]', {
      visible: true,
    });
    //await btn.click();
  }

  async addToCart(cookies, page) {
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
}

module.exports = Bhphotovideo;
