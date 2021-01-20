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
    let userId = credential.userId;

    // add to cart
    console.log(`${userId}: adding to cart.`);
    await this.addToCartHandle(credential);

    let page = await this.launchBrowser(credential);

    // disable annoying popup
    page = await this.disableMaskModal(page);

    // go to shopping cart
    console.log(`${userId}: opening cart.`);
    await page.goto("https://secure.newegg.com/shop/cart");

    // go to checkout page
    console.log(`${userId}: opening checkout page.`);
    let btn = await page.waitForXPath(
      "//button[contains(text(), ' Secure Checkout ')]",
      {
        visible: true,
      }
    );

    let needLogin = false;

    // might need to login again
    await Promise.all([
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
      console.log(`${userId}: logging in.`);
      await this.loginHandle(credential, page);
    }

    // continuing to payment
    console.log(`${userId}: continuing to payment.`);
    btn = await page.waitForXPath(
      "//button[contains(text(), 'Continue to payment')]",
      {
        visible: true,
      }
    );
    await btn.click();

    // input cvv
    console.log(`${userId}: entering cvv.`);
    let cvv = await page.waitForSelector(".form-text.mask-cvv-4", {
      visible: true,
    });
    await cvv.type(credential.cvv);

    // revewing order
    console.log(`${userId}: reviewing order.`);
    btn = await page.waitForXPath(
      "//button[contains(text(), 'Review your order')]",
      {
        visible: true,
      }
    );
    await btn.click();

    // submitting order
    console.log(`${userId}: submitting order.`);
    btn = await page.waitForSelector("#btnCreditCard", { visible: true });

    // finally buy item
    if (!this.testMode) {
      await btn.click();
      await page.waitForTimeout(10000);
      let cookies = await page.cookies();
      this.cookies.set(userId, cookies);
      return;
    }

    // empty cart
    console.log(`${userId}: emptying cart.`);
    await this.emptyCart(credential, page);
  }

  /**
   * Disable annoying popup in cart page
   */
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

  async emptyCart(credential, page) {
    await page.goto("https://secure.newegg.com/shop/cart");
    let btn = await page.waitForSelector(
      'button[data-target="#Popup_Remove_All"]',
      { visible: true }
    );
    await btn.click();

    btn = await page.waitForXPath(
      "//button[contains(text(), 'Yes, Remove all of them.')]",
      {
        visible: true,
      }
    );
    await btn.click();
    await page.waitForTimeout(1500);

    let cookies = await page.cookies();
    this.cookies.set(credential.userId, cookies);
  }
}

module.exports = Newegg;
