"use strict";

const Verification = require("../../services/verification");
const Credential = require("../../services/credential");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteer.use(StealthPlugin());

class Base {
  constructor(userId, store, email, password, cvv, page) {
    this.userId = userId;
    this.store = store;
    this.email = email;
    this.password = password;
    this.cvv = cvv;
    this.page = page;

    this.browser = null;
    this.cookies = null;
    this.storeContext = null;

    // page is passed when login request comes from Autobuyer
    // Don't close browser
    if (page) this.autoBuyerRequest = true;
  }

  /**
   * Starts loging process
   */
  async start(storeContext) {
    this.storeContext = storeContext;

    if (Verification.has(this.userId)) {
      throw "Can't start a new login while waiting for a verification.";
    }

    // try to login
    try {
      await this.storeContext.login();
    } catch (e) {
      // save store instance if verification is needed
      if (e === "verification") {
        // don't save if login request came from autobuyer
        if (!this.autoBuyerRequest) {
          Verification.set(this.userId, this.storeContext);
        }
        throw e;
      }

      // don't close browser if request came from autobuyer
      if (!this.autoBuyerRequest) {
        //await this.closeBrowser();
      }

      // display what went wrong
      if (typeof e === "object") {
        console.error(e);
        throw "Unexpected error, try again.";
      }
      throw e;
    }
    // login successful
    await this.saveCredential();
  }

  async saveCredential() {
    await Credential.set(
      this.userId,
      this.store,
      this.email,
      this.password,
      this.cvv,
      this.cookies
    );
  }

  async launchBrowser() {
    // only open a browser if page wasnt passed, this means request came from autobuyer
    if (!this.autoBuyerRequest) {
      this.browser = await puppeteer.launch(Base.launchOptions);
      this.page = await this.browser.newPage();
    }
  }

  async closeBrowser() {
    if (this.autoBuyerRequest || !this.browser) return;
    await this.browser.close();
    this.browser = null;
  }

  async verify(code) {
    if (!Verification.has(this.userId)) {
      throw "There is no verification needed.";
    }

    try {
      await this.storeContext.verifyLogin(code);
    } catch (e) {
      // close browser for any other error
      if (e === "Incorrect code, try again.") {
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
    await this.saveCredential();
  }
}

// puppeteer launch options
Base.launchOptions = require("../../configs/puppeteer");

module.exports = Base;
