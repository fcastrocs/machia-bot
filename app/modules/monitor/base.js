"use strict";

const axios = require("axios").default;
const httpsProxyAgent = require("https-proxy-agent");

const CheckerService = require("../../services/checker");
const Autobuyer = require("../autobuyer");
const UserItem = require("../../services/userItem");
const Job = require("../../services/job");
const Proxy = require("../proxy");
const Discord = require("discord.js");
const webhookClient = new Discord.WebhookClient(
  process.env.WEBHOOK_CHANNELID,
  process.env.WEBHOOK_TOKEN
);

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

    try {
      var data = await this.fetch(this.url);
    } catch (e) {
      await this.logDiscord(
        `${this.store}: couldn't scrape itemID: ${this.itemId}`
      );
      throw "Couldn't scrape this url, try again.";
    }

    try {
      this.storeContext.parse(data);
    } catch (e) {
      `${this.store}: couldn't parse itemID: ${this.itemId}`;
      throw "Couldn't parse this url, try again.";
    }
  }

  /**
   * fetch html from url
   */
  async fetch(url) {
    const config = {
      timeout: process.env.SCRAPE_INTERVAL - 500,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.2 Safari/605.1.15",
        "Accept-Language": "en-US,en;q=0.9,es-US;q=0.8,es;q=0.7",
      },
    };

    // only use proxies in production
    if (process.env.NODE_ENV === "production") {
      let proxy = Proxy.get();
      const httpsAgent = new httpsProxyAgent(`http://${proxy}`);
      config.httpsAgent = httpsAgent;
    }
    let res = await axios.get(url, config);
    return res.data;
  }

  /**
   * Stop checker
   */
  stop() {
    if (!this.isRunning) return;
    clearInterval(this.interval);
    this.isRunning = false;
  }

  /**
   * Check whether a checker for this product already exists.
   */
  isDuplicate() {
    return CheckerService.has(this.store, this.itemId);
  }

  /**
   * Returns whether product is available to purchase
   */
  isAvailable() {
    return !this.outOfStock;
  }

  /**
   * Setter for scraped product data
   */
  setValues(title, itemId, outOfStock) {
    this.title = title;
    this.itemId = itemId;
    this.outOfStock = outOfStock;
  }

  async logDiscord(message) {
    try {
      await webhookClient.send(message);
    } catch (e) {
      console.error("Monitor: couldn't log to discord.");
    }
  }
}

module.exports = Base;
