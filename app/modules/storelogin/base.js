"use strict";

const Verification = require("../../services/verification");
const Credential = require("../../services/credential");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteer.use(StealthPlugin());

class Base {
  constructor(store) {
    this.store = store;

    this.browser = null;
    this.page = null;
    this.cookies = null;
    this.storeContext = null;
    this.autoBuyerRequest = false;
  }

  setUserData(userId, email, password, proxy) {
    this.userId = userId;
    this.email = email;
    this.password = password;
    this.proxy = proxy;
  }

  async storeCookies() {
    // only store cookies when login request came from auto-buyer
    if (!this.autoBuyerRequest) return;
    await Credential.set(this.userId, this.store, [this.cookies]);
  }

  getCookies() {
    return this.cookies;
  }

  setAutoBuyerRequest(page) {
    this.autoBuyerRequest = true;
    this.page = page;
  }

  /**
   * Returns previous instance that needs verification
   */
  getVerifyInstance(userId) {
    let instance = Verification.get(userId);
    if (!instance) {
      throw "There's no login waiting for verification.";
    }
    return instance;
  }

  /**
   * Starts login process
   */
  async start(storeContext) {
    this.storeContext = storeContext;

    if (Verification.has(this.userId)) {
      throw "Can't start a new login while waiting for a verification.";
    }

    // try to login
    try {
      this.cookies = await this.storeContext.login();
      await this.closeBrowser();
      await this.storeCookies();
    } catch (e) {
      // save store instance if verification is needed
      if (e === "verification") {
        // don't save if login request came from autobuyer
        if (!this.autoBuyerRequest) {
          Verification.set(this.userId, this.storeContext);
        }
        throw e;
      }

      await this.closeBrowser();

      // display what went wrong
      if (typeof e === "object") {
        console.error(e);
        throw "Unexpected error, try again.";
      }
      throw e;
    }
  }

  async launchBrowser() {
    // only open a browser if page wasnt passed, this means request came from autobuyer
    if (!this.autoBuyerRequest) {
      Base.launchOptions.args.push(`--proxy-server=http://${this.proxy}`);
      this.browser = await puppeteer.launch(Base.launchOptions);
      this.page = await this.browser.newPage();
    }
  }

  async closeBrowser() {
    if (
      this.autoBuyerRequest ||
      !this.browser ||
      process.env.DONTCLOSE === "true"
    )
      return;

    await this.browser.close();
  }

  async verify(code) {
    if (!Verification.has(this.userId)) {
      throw "There is no verification needed.";
    }

    try {
      this.cookies = await this.storeContext.verifyLogin(code);
    } catch (e) {
      // close browser for any other error
      if (e === "Incorrect code, try again." || e === "verification") {
        throw e;
      }

      await this.closeBrowser();

      // display what went wrong
      if (typeof e === "object") {
        console.error(e);
        throw "Unexepected error, try again.";
      }
      throw e;
    }

    await this.closeBrowser();
    Verification.remove(this.userId);
    await this.storeCookies();
  }
}

// puppeteer launch options
Base.launchOptions = require("../../configs/puppeteer");

module.exports = Base;
