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
    console.log("Adding to cart.");
    await this.addToCartHandle(credential);
    let page = await this.launchBrowser(credential);

    page = await this.disableMaskModal(page);

    // go to shopping cart
    console.log("Opening cart.");
    await page.goto("https://secure.newegg.com/shop/cart");

    console.log("Opening Checkout page.");
    let btn = await page.waitForXPath(
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
      console.log("Logging in.");
      await this.loginHandle(credential, page);
    }

    console.log("Continuing to payment.");
    btn = await page.waitForXPath(
      "//button[contains(text(), 'Continue to payment')]"
    );

    await Promise.all([
      page.waitForResponse((req) => req.url().includes("InitOrderReviewApi")),
      btn.click(),
    ]);

    let cvv = await page.waitForSelector(".form-text.mask-cvv-4");
    await cvv.type(credential.cvv);

    console.log("Reviewing order.");
    btn = await page.waitForXPath(
      "//button[contains(text(), 'Review your order')]"
    );

    await Promise.all([
      page.waitForResponse((req) => req.url().includes("InitOrderReviewApi")),
      btn.click(),
    ]);

    console.log("Submitting order.");
    btn = await page.waitForSelector("#btnCreditCard");
    // finally buy item

    if (!this.testMode) {
      await btn.click();
      await page.waitForTimeout(10000);
      return;
    }

    // empty cart
    console.log("Emptying cart.");
    await page.goto("https://secure.newegg.com/shop/cart", {
      waitUntil: "networkidle0",
    });
    btn = await page.waitForSelector('button[data-target="#Popup_Remove_All"]');
    await btn.click();

    btn = await page.waitForXPath(
      "//button[contains(text(), 'Yes, Remove all of them.')]",
      { visible: true }
    );
    await btn.click();
    await page.waitForTimeout(5000);
    let cookies = await page.cookies();
    this.cookies.set(credential.userId, cookies);
  }

  async disableMaskModal(page) {
    await page.setRequestInterception(true);
    function dummyResponse(r) {
      r.respond({
        status: 200,
        contentType: "text/plain",
        body: "tweak me.",
      });
    }
    page.on("request", dummyResponse);
    await page.goto("https://secure.newegg.com/shop/cart");
    // don't show masks modal
    await page.evaluate(() => {
      // eslint-disable-next-line no-undef
      localStorage.setItem("aatc_mask_show2", "1");
    });
    await page.close();
    return await (await page.browser()).newPage();
  }

  async addToCart(credential) {
    // get customer number
    for (let cookie of credential.cookies) {
      if (cookie.name === "NV%5FOTHERINFO") {
        var value = cookie.value;
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
    let cookies = this.cookiesToString(credential.cookies);

    let options = {
      url: ADD2CART_URL,
      method: "post",
      cookies,
      proxy: credential.proxy,
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

    let res = await this.httpRequest(options);
    if (res.status !== 201) {
      throw res;
    }
  }
}

module.exports = Newegg;
