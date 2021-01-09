const Base = require("../base");
const axios = require("axios");
const httpsProxyAgent = require("https-proxy-agent");
const Proxy = require("../../proxy");

class Newegg extends Base {
  constructor(url, itemId, title) {
    super(url, "newegg", itemId, title);
  }

  start() {
    return this.startPurchases(this);
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
    await btn.click();
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

    // set proxy
    let proxy = Proxy.get();
    const httpsAgent = new httpsProxyAgent(`http://${proxy}`);

    let config = {
      url: "https://www.newegg.com/api/Add2Cart",
      method: "post",
      httpsAgent,
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
      headers: {
        "accept-language": "en-US,en;q=0.9,es-US;q=0.8,es;q=0.7",
        "content-type": "application/json",
        Cookie: cookies,
        referer: this.url,
        "ec-ch-ua":
          '"Google Chrome";v="87", " Not;A Brand";v="99", "Chromium";v="87"',
        "sec-ch-ua-mobile": "?0",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": Base.userAgent,
      },
    };

    let res = await axios.request(config);
    if (res.status !== 201) {
      throw res;
    }
  }
}

module.exports = Newegg;
