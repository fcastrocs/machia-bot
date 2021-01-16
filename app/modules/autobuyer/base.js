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
const StoreLogin = require("../storelogin");
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

  /**
   * Test auto-buyer without buying.
   */
  async test(storeContext, credential) {
    this.storeContext = storeContext;
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

  /**
   * Get credentials[] of all users who want to buy this item
   */
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

  /**
   * Attemp purchase with retry
   */
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
          await this.storeContext.purchase(credential);
          await this.closeBrowser(userId);
          resolve(userId);
        } catch (err) {
          console.error(err);
          await this.closeBrowser(userId);
          // try again
          if (operation.retry(err)) {
            return;
          }
          if (typeof err === "object") {
            return reject({ userId, err: "Unexpected error occurred." });
          }
          return reject({ userId, err });
        }
      });
    });
  }
  /**
   * Handles add to cart with retry
   * page is passed when puppteer is used instead of axios
   */
  addToCartHandle(userId, cookies, page) {
    // check if already added to cart
    if (this.added2Cart.has(userId)) {
      return;
    }

    let operation = retry.operation({
      retries: process.env.ADDTOCART_RETRY,
      minTimeout: 0,
      maxTimeout: 0,
    });

    return new Promise((resolve, reject) => {
      operation.attempt(async () => {
        try {
          let data = await this.storeContext.addToCart(cookies, page);
          this.added2Cart.add(userId);
          resolve(data);
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

  async httpRequest(options) {
    const httpsAgent = new httpsProxyAgent(
      `http://${process.env.RESIDENTIAL_PROXY}`
    );

    let config = {
      url: options.url,
      method: options.method,
      httpsAgent,
      timeout: process.env.ADDTOCART_TIMEOUT,
      headers: {
        accept: "application/json, text/javascript, */*; q=0.01",
        "accept-encoding": "gzip, deflate, br",
        "accept-language": "en-US,en;q=0.9,es-US;q=0.8,es;q=0.7",
        "cache-control": "no-cache",
        "content-type": "application/json; charset=UTF-8",
        cookie: options.cookies,
        origin: options.origin,
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:84.0) Gecko/20100101 Firefox/84.0",
      },
    };

    if (options.referer) config.referer = options.referer;
    if (options.data) config.data = options.data;

    return axios.request(config);
  }

  cookiesToString(cookies) {
    let string = "";
    for (let cookie of cookies) {
      string += `${cookie.name}=${cookie.value}; `;
    }
    return string;
  }

  async launchBrowser(userId, cookies) {
    let browser = await puppeteer.launch(launchOptions);
    this.browsers.set(userId, browser);
    let page = await browser.newPage();
    await page.setCookie(...cookies);
    return page;
  }

  async closeBrowser(userId) {
    if (process.env.DONTCLOSE === "true") return;
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
}

module.exports = Base;
