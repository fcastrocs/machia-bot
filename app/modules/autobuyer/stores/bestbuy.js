const Base = require("../base");
const axios = require("axios");

class Store extends Base {
  constructor(url, itemId, title) {
    super(url, "store", itemId, title);
  }

  start() {
    return this.startPurchases(this);
  }

  async purchase(credential) {
    await this.addToCartHandle(credential.userId, credential.cookies);
    let page = await this.launchBrowser(credential.userId, credential.cookies);

    // go to shopping cart
    await page.goto("", {
      waitUntil: "networkidle0",
    });

    // code here

    await this.closeBrowser(credential.userId);
  }

  async addToCart(cookies) {
    cookies = this.cookiesToString(cookies);

    let config = {
      url: "",
      method: "post",
      data: {},
      headers: {
        Cookie: cookies,
        referer: this.url,
        "user-agent": Base.userAgent,
      },
    };

    await axios.request(config);
  }
}

module.exports = Store;
