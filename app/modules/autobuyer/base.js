/**
 * Contains General code that all stores will use.
 * Must only be extended by Store classes
 */

"use strict";

const { firefox } = require("playwright");
const launchOptions = require("../../configs/puppeteer");

const retry = require("retry");
const axios = require("axios").default;

const Buyer = require("../../services/buyer");
const Credential = require("../../services/credential");

const StoreLogin = require("../storelogin");
const httpsProxyAgent = require("https-proxy-agent");
const DiscordLogger = require("../discordlogger");

class Base {
  constructor(url, store, itemId, title) {
    this.url = url;
    this.title = title;
    this.store = store;
    this.itemId = itemId;

    this.browsers = new Map();
    this.cookies = new Map();
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
    console.log("Auto-Purchase is starting...");

    await DiscordLogger.notify(`Attempting purchases for ${this.title}`);

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
        await Buyer.remove(res.value, this.store, this.itemId);
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

    await DiscordLogger.buyersNotification(results, this.title);
  }

  /**
   * Get credentials[] of all users who want to buy this item
   */
  async getAllBuyerCredentials() {
    let docs = await Buyer.getItemBuyers(this.store, this.itemId);

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
          await this.closeBrowser(credential);
          resolve(userId);
        } catch (err) {
          console.error(err);
          await this.closeBrowser(credential);
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
  addToCartHandle(credential, page) {
    let userId = credential.userId;

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
          let data = await this.storeContext.addToCart(credential, page);
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
    const httpsAgent = new httpsProxyAgent(`http://${options.proxy}`);

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

  async launchBrowser(credential) {
    for (let cookie of credential.cookies) {
      if (cookie.value === "" || !cookie.value) {
        cookie.value = "1";
      }
    }

    launchOptions.proxy = {
      server: `http://${credential.proxy}`,
    };
    const browser = await firefox.launch(launchOptions);
    const context = await browser.newContext();
    await context.addCookies(credential.cookies);
    const page = await context.newPage();
    return page;
  }

  async updateCookies(credential) {
    let cookies = this.cookies.get(credential.userId);
    if (cookies) {
      await Credential.set(credential.userId, this.store, [cookies]);
    }
  }

  async closeBrowser(credential) {
    await this.updateCookies(credential);
    if (process.env.DONTCLOSE === "true") return;
    let browser = this.browsers.get(credential.userId);
    if (!browser) return;
    await browser.close();
  }

  async loginHandle(credential, page) {
    let storeLogin = new StoreLogin(this.store);
    storeLogin.setUserData(
      credential.userId,
      credential.email,
      credential.password,
      credential.proxy
    );
    storeLogin.setAutoBuyerRequest(page);
    await storeLogin.start();
  }
}

module.exports = Base;
