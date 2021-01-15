"use strict";

const cheerio = require("cheerio");
const axios = require("axios").default;
const httpsProxyAgent = require("https-proxy-agent");

const CheckerService = require("../../services/checker");
const Autobuyer = require("./../autobuyer");
const UserItem = require("../../services/userItem");
const Job = require("../../services/job");
const Proxy = require("../proxy");

class Base {
  constructor(url, store) {
    this.url = url;
    this.store = store;

    this.interval = null;

    this.title = null;
    this.itemId = null;
    this.outOfStock = false;

    this.storeContext = null;
    this.isRunning = false;
    this.isAutoBuying = false;
  }

  /**
   * Starts checking interval, and autobuy when available.
   */
  start(ignore) {
    if (!ignore && this.isDuplicate()) {
      throw "A checker for this URL is already running.";
    }

    if (this.isRunning) {
      throw "This checker is already running.";
    }

    // store this instance
    CheckerService.add(this.store, this.itemId, this.storeContext);

    this.isRunning = true;

    this.interval = setInterval(async () => {
      if (this.isAutoBuying) return;

      try {
        await this.getData();
      } catch (error) {
        return;
      }

      if (!this.isAvailable()) {
        return;
      }

      // stop checker
      this.stop();

      // Start autobuy
      this.isAutoBuying = true;
      let autobuyer = new Autobuyer(
        this.url,
        this.store,
        this.itemId,
        this.title
      );
      await autobuyer.start();
      // get users who wanted to buy this item
      let docs = await UserItem.getAll(null, this.store, this.itemId);

      // remove job and checker because all users bought the item
      if (docs.length === 0) {
        CheckerService.remove(this.store, this.itemId);
        await Job.remove(this.itemId, this.store);
        return;
      }

      // There are still users who want to buy this item.
      this.isAutoBuying = false;
      this.start(true);
    }, process.env.SCRAPE_INTERVAL);
  }

  /**
   * Scrape necessary info such as title and availability
   */
  async getData(context) {
    this.storeContext = context;

    let data = await this.fetch(this.url);
    const $ = cheerio.load(data);

    try {
      this.storeContext.parse($);
    } catch (e) {
      if (typeof e === "object") {
        console.error(e);
        throw "Unexpected error occurred, try again.";
      }
      throw e;
    }
    console.log(`${this.store}:${this.itemId} scrapped.`);
  }

  stop() {
    if (!this.isRunning) return;
    clearInterval(this.interval);
    this.isRunning = false;
  }

  async fetch(url) {
    const config = {
      timeout: process.env.SCRAPE_INTERVAL - 500,
    };

    if (process.env.NODE_ENV === "production") {
      let proxy = Proxy.get();
      const httpsAgent = new httpsProxyAgent(`http://${proxy}`);
      config.httpsAgent = httpsAgent;
    }

    config.headers = {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.2 Safari/605.1.15",
      "Upgrade-Insecure-Requests": "1",
      "Accept-Language": "en-US,en;q=0.9,es-US;q=0.8,es;q=0.7",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
      "Accept-Encoding": "gzip, deflate",
    };

    try {
      let res = await axios.get(url, config);
      return res.data;
    } catch (e) {
      console.error(`${this.store}:${this.itemId} scrape failed: ${e}`);
      throw "Couldn't load page, try again.";
    }
  }

  isDuplicate() {
    return CheckerService.has(this.store, this.itemId);
  }

  isAvailable() {
    return !this.outOfStock;
  }

  setValues(title, itemId, outOfStock) {
    this.title = title;
    //parsed from url
    if (itemId) {
      this.itemId = itemId;
    }
    this.outOfStock = outOfStock;
  }
}

module.exports = Base;
