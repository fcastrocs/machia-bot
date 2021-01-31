"use strict";

const axios = require("axios").default;
const httpsProxyAgent = require("https-proxy-agent");

const MonitorService = require("../../services/monitor");
const Buyer = require("../../services/buyer");
const Watcher = require("../../services/watcher");

const Autobuyer = require("../autobuyer");
const Proxy = require("../proxy");
const DiscordLogger = require("../discordlogger");

class Base {
  constructor(url, store) {
    this.url = url;
    // some monitors scrape from an api, not the url given by user.
    this.internalurl = url;
    this.store = store;

    this.interval = null;

    this.title = null;
    this.itemId = null;
    this.outOfStock = true;

    this.storeContext = null;
    this.isRunning = false;
    this.isAutoBuying = false;
  }

  /**
   * Starts monitor interval
   */
  async start(ignore) {
    if (!ignore && (await this.isDuplicate())) {
      throw "A monitor for this URL is already running.";
    }

    if (this.isRunning) {
      throw "This monitor is already running.";
    }

    this.isRunning = true;

    // start interval
    this.interval = setInterval(async () => {
      // avoid any possible race condition
      if (this.isAutoBuying) return;

      try {
        await this.getData();
      } catch (error) {
        return;
      }

      // product is not available
      if (!this.isAvailable()) {
        return;
      }

      // stop monitor
      this.stop();

      let watchers = await Watcher.getItemWatchers(this.store, this.itemId);
      let buyers = await Buyer.getItemBuyers(this.store, this.itemId);

      // send discord notifications
      await this.notifyOnDiscord(watchers, buyers);

      // There's no buyers
      if (buyers.length === 0) {
        return await MonitorService.remove(this.store, this.itemId);
      }

      // Start autobuyer
      this.isAutoBuying = true;

      let autobuyer = new Autobuyer(
        this.url,
        this.store,
        this.itemId,
        this.title
      );
      await autobuyer.start();

      // no more buyers after auto-buyer finishes, remove monitor
      buyers = await Buyer.getItemBuyers(this.store, this.itemId);
      if (buyers.length === 0) {
        return await MonitorService.remove(this.store, this.itemId);
      }

      // There are still users who want to buy this item.
      this.isAutoBuying = false;
      this.start(true);
    }, process.env.SCRAPE_INTERVAL);
  }

  /**
   * Notifies all watchers and buyers then removes watchers from DB
   */
  async notifyOnDiscord(watchers, buyers) {
    let mentions = "";
    for (let watcher of watchers) {
      mentions += `<@${watcher.userId}> `;
    }

    for (let buyer of buyers) {
      mentions += `<@${buyer.userId}> `;
    }

    await DiscordLogger.notify(mentions);

    await DiscordLogger.onStockNotification({
      title: this.title,
      url: this.url,
    });
    await Watcher.removeItemWatchers(this.store, this.itemId);
  }

  /**
   * Stop checker
   */
  stop() {
    if (!this.isRunning) return;
    clearInterval(this.interval);
    this.isRunning = false;
  }

  /**`
   * Scrape itemId, title, availability
   */
  async getData(context) {
    this.storeContext = context;

    try {
      var data = await this.fetch(this.internalurl);
    } catch (e) {
      if (this.isRunning) {
        console.error(`${this.store}: couldn't scrape itemID: ${this.itemId}`);
      }
      throw `Couldn't scrape this url.`;
    }

    try {
      this.storeContext.parse(data);
    } catch (e) {
      if (this.isRunning) {
        console.error(`${this.store}: couldn't parse itemID: ${this.itemId}`);
      }
      throw "Couldn't parse this url.";
    }

    console.log(`${this.store} monitor: itemid ${this.itemId}`);
    return { itemId: this.itemId, title: this.title };
  }

  /**
   * Check whether a checker for this product already exists.
   */
  async isDuplicate() {
    return await MonitorService.has("map", this.store, this.itemId);
  }

  /**
   * Returns whether product is available to purchase
   */
  isAvailable() {
    return !this.outOfStock;
  }

  /**
   * fetch html from url
   */
  async fetch(url) {
    const config = {
      timeout: process.env.SCRAPE_INTERVAL - 500,
      headers: {
        "Accept-Language": "en-US,en;q=0.5",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
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
   * Setter for scraped product data
   */
  setValues(title, itemId, outOfStock) {
    this.title = title;
    this.itemId = itemId;
    this.outOfStock = outOfStock;
  }
}

module.exports = Base;
