const Base = require("../base");

const ADD2CART_URL = "https://www.newegg.com/api/Add2Cart";

class Newegg extends Base {
  constructor(url, itemId, title) {
    super(url, "newegg", itemId, title);
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
    await page.goto("https://secure.newegg.com/shop/cart", {
      waitUntil: "networkidle0",
    });

    // try to close popup modal
    let btn = await page.$("button[data-dismiss=modal]");
    if (btn) {
      let checkbox = await page.waitForXPath(
        "//span[contains(text(), 'Do not show this message again.')]"
      );
      await checkbox.click();
      await btn.click();
    }

    btn = await page.waitForXPath(
      "//button[contains(text(), ' Secure Checkout ')]"
    );

    let needLogin = false;

    // go to check out, might need to login again.
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle0" }),
      page.waitForResponse((req) => {
        if (req.url().includes("identity/signin?")) {
          needLogin = true;
          return true;
        }
        if (req.url().includes("checkout?sessionId")) {
          return true;
        }
      }),
      btn.click(),
    ]);

    // login is needed.
    if (needLogin) {
      await this.loginHandle(credential, page);
    }

    btn = await page.waitForXPath(
      "//button[contains(text(), 'Continue to payment')]"
    );

    await Promise.all([
      page.waitForResponse((req) => req.url().includes("InitOrderReviewApi")),
      btn.click(),
    ]);

    let cvv = await page.waitForSelector(".form-text.mask-cvv-4");
    await cvv.type(credential.cvv);

    btn = await page.waitForXPath(
      "//button[contains(text(), 'Review your order')]"
    );

    await Promise.all([
      page.waitForResponse((req) => req.url().includes("InitOrderReviewApi")),
      btn.click(),
    ]);

    btn = await page.waitForSelector("#btnCreditCard");
    // finally buy item

    if (!this.testMode) {
      await btn.click();
    }
  }

  async addToCart(cookies) {
    let value = null;

    // get customer number
    for (let cookie of cookies) {
      if (cookie.name === "NV%5FOTHERINFO") {
        value = cookie.value;
        break;
      }
    }

    if (!value) throw "Add to cart failed, invalid cookie.";

    value = decodeURIComponent(value);
    value = value.replace("#5", "");
    value = JSON.parse(value);

    try {
      var customerNumber = value.Sites.USA.Values.sc;
    } catch (e) {
      throw "Add to cart failed, invalid cookie.";
    }

    customerNumber = decodeURIComponent(customerNumber);
    cookies = this.cookiesToString(cookies);

    let options = {
      url: ADD2CART_URL,
      cookies,
      data: {
        ItemList: [
          {
            ItemGroup: "Single",
            ItemNumber: this.itemId,
            Quantity: 1,
            OptionalInfos: null,
            SaleType: "Sales",
          },
        ],
        customerNumber,
      },
      origin: "https://www.newegg.com",
    };

    let res = await this.addToCartRequest(options);
    if (res.status !== 201) {
      throw res;
    }
  }
}

module.exports = Newegg;
