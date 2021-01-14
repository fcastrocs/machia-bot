/**
 * Contains General code that all stores will use.
 * Must only be extended by Store classes
 */

"use strict";

const puppeteer = require("puppeteer-extra").default;
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteer.use(StealthPlugin());
// puppeteer launch options
const launchOptions = require("../../configs/puppeteer");

const retry = require("retry");
const emitter = require("../emitter");
const axios = require("axios").default;

const UserItem = require("../../services/userItem");
const Credential = require("../../services/credential");
const StoreLogin = require("../storeLogin");
const httpsProxyAgent = require("https-proxy-agent");

class Base {
  constructor(url, store, itemId, title) {
    this.url = url;
    this.title = title;
    this.store = store;
    this.itemId = itemId;

    this.browsers = new Map();
    this.added2Cart = new Set();

    this.storeContext = null;
  }

  async test(credential) {
    this.testMode = true;
    try {
      await this.attemptPurchase(credential);
    } catch (e) {
      throw e.err;
    }
  }

  /**
   * Starts purchase process
   */
  async startPurchases(storeContext) {
    this.storeContext = storeContext;

    emitter.emit("autobuyer-start", { url: this.url, title: this.title });

    let credentials = await this.getAllBuyerCredentials();
    // attemp purchases
    let promises = [];
    for (let credential of credentials) {
      promises.push(this.attemptPurchase(credential));
    }

    let values = await Promise.allSettled(promises);

    let results = new Map();
    results.set("fulfilled", new Array());
    results.set("rejected", new Array());

    // format message for each user
    for (let res of values) {
      let msg = "";

      if (res.status === "fulfilled") {
        await UserItem.remove(res.value, this.itemId, this.store);
        results.get("fulfilled").push(res.value);
      } else {
        if (typeof res.reason.err === "object") {
          res.reason.err = "Unexecpected error occurred.";
        }
        msg = {
          userId: res.reason.userId,
          err: res.reason.err,
        };
        results.get("rejected").push(msg);
      }
    }

    emitter.emit("autobuy-finished", results);
  }

  async getAllBuyerCredentials() {
    let docs = await UserItem.getAll(null, this.store, this.itemId);
    if (docs.length === 0) {
      throw "No user wants to buy this item";
    }

    let credentials = new Array();

    for (let doc of docs) {
      let credential = await Credential.get(doc.userId, this.store);
      credentials.push(credential);
    }
    return credentials;
  }

  attemptPurchase(credential) {
    return new Promise((resolve, reject) => {
      let operation = retry.operation({
        retries: process.env.PURCHASE_RETRY,
        minTimeout: 0,
        maxTimeout: 0,
      });

      operation.attempt(async () => {
        let userId = credential.userId;
        try {
          // attempt to purchase item
          await this.storeContext.purchase(credential);
          if (process.env.DONTCLOSE === "true") {
            await this.closeBrowser(userId);
          }
          resolve(userId);
        } catch (err) {
          console.error(err);

          if (process.env.DONTCLOSE === "true") {
            await this.closeBrowser(userId);
          }
          // try again
          if (operation.retry(err)) {
            return;
          }
          if (typeof err === "object") {
            return reject({ userId, err: "Unexpected error occurred." });
          }
          reject({ userId, err });
        }
      });
    });
  }

  async launchBrowser(userId, cookies) {
    cookies = JSON.parse(cookies);
    let browser = await puppeteer.launch(launchOptions);
    this.browsers.set(userId, browser);
    let page = await browser.newPage();
    await page.setCookie(...cookies);
    return page;
  }

  async closeBrowser(userId) {
    let browser = this.browsers.get(userId);
    if (!browser) return;
    await browser.close();
  }

  async loginHandle(credential, page) {
    let storeLogin = new StoreLogin(
      credential.userId,
      this.store,
      credential.email,
      credential.password,
      credential.cvv,
      page
    );

    await storeLogin.start();
  }

  // Page is passed when puppteer is used instead of axios
  addToCartHandle(userId, cookies, page) {
    if (cookies) {
      cookies = JSON.parse(cookies);
    }

    // check if already added to cart
    if (this.added2Cart.has(userId)) {
      return;
    }

    let operation = retry.operation({
      retries: process.env.ADDTOCARD_RETRY,
      minTimeout: 0,
      maxTimeout: 0,
    });

    return new Promise((resolve, reject) => {
      operation.attempt(async () => {
        try {
          await this.storeContext.addToCart(cookies, page);
          this.added2Cart.add(userId);
          resolve();
        } catch (error) {
          if (operation.retry(error)) {
            return;
          }

          if (typeof error === "object") {
            console.error(error);
            return reject("Add to cart failed.");
          }
          return reject(error);
        }
      });
    });
  }

  cookiesToString(cookies) {
    let string = "";
    for (let cookie of cookies) {
      string += `${cookie.name}=${cookie.value}; `;
    }
    return string;
  }

  async addToCartRequest(options) {
    const httpsAgent = new httpsProxyAgent(
      `http://${process.env.RESIDENTIAL_PROXY}`
    );

    let config = {
      url: options.url,
      method: "post",
      data: options.data,
      httpsAgent,
      timeout: process.env.ADDTOCART_TIMEOUT,
      headers: {
        accept: "application/json",
        "accept-encoding": "gzip, deflate, br",
        "accept-language": "en-US,en;q=0.9,es-US;q=0.8,es;q=0.7",
        "cache-control": "no-cache",
        "content-type": "application/json; charset=UTF-8",
        cookie: options.cookies,
        origin: options.origin,
        pragma: "no-cache",
        referer: this.url,
        "sec-ch-ua":
          '"Google Chrome";v="87", " Not;A Brand";v="99", "Chromium";v="87"',
        "sec-ch-ua-mobile": "?",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.141 Safari/537.36",
      },
    };

    return await axios.request(config);
  }
}

module.exports = Base;
