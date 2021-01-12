"use strict";

const Base = require("../base");

const STORE_URL = "https://www.newegg.com/";
const LOGIN_URL = "https://secure.newegg.com/NewMyAccount/AccountLogin.aspx";

class Newegg extends Base {
  constructor(userId, email, password, cvv, page) {
    super(userId, "newegg", email, password, cvv, page);
  }

  /**
   * Start login process
   */
  start() {
    return super.start(this);
  }

  async login() {
    if (!this.autoBuyerRequest) {
      await this.launchBrowser();
      await this.page.goto(STORE_URL);
      await this.page.goto(LOGIN_URL);
    }

    // Enter email
    let input = await this.page.waitForSelector("input[name=signEmail]", {
      visible: true,
    });
    await input.type(this.email);

    //click submit button
    let p = await Promise.all([
      this.page.waitForResponse((req) =>
        req.url().includes("CheckLoginName?ticket")
      ),
      this.page.click("button[type=submit]"),
    ]);

    let res = await p[0].json();

    // check for credential errors
    if (res.Result === "SignInFailure") {
      throw "Bad credentials, try again.";
    }

    // verfication needed
    if (res.Result === "ReCaptchaFailed") {
      throw "verification";
    }

    // some other error occurred
    if (res.Result !== "Success") {
      console.error(res);
      throw "Unexpected error, try again.";
    }

    // Enter password
    input = await this.page.waitForSelector("input[name=password]", {
      visible: true,
    });
    await input.type(this.password);

    let verification = this.page.waitForResponse((req) =>
      req.url().includes("identity/2sverification")
    );

    // click submit button
    p = await Promise.allSettled([
      this.page.waitForResponse((req) => req.url().includes("SignIn?ticket")),
      this.page.click("button[type=submit]"),
    ]);

    try {
      res = await p[0].json();
    } catch (e) {
      var noresponse = true;
    }

    // empty response means either 2FA or successfull login, require 2FA
    if (noresponse) {
      try {
        await verification;
        throw "verification";
      } catch (e) {
        throw "For your security, setup 2FA to your account, try again.";
      }
    }

    if (res.Result === "SignInFailure") {
      throw "Bad credentials, try again.";
    }

    console.error(res);
    throw "Unexpected error, try again.";
  }

  async verifyLogin(code) {
    if (code.length !== 6) {
      throw "Incorrect code, try again.";
    }

    await this.page.type('input[aria-label="verify code 1"]', code.charAt(0));
    await this.page.type('input[aria-label="verify code 2"]', code.charAt(1));
    await this.page.type('input[aria-label="verify code 3"]', code.charAt(2));
    await this.page.type('input[aria-label="verify code 4"]', code.charAt(3));
    await this.page.type('input[aria-label="verify code 5"]', code.charAt(4));
    await this.page.type('input[aria-label="verify code 6"]', code.charAt(5));

    let p = await Promise.all([
      this.page.waitForResponse((req) =>
        req.url().includes("SignInByCode?ticket")
      ),
      this.page.click("button[type=submit]"),
    ]);

    let res = null;

    try {
      res = await p[0].json();
    } catch (e) {
      // login successfull, empty response
      this.cookies = await this.page.cookies();
      return;
    }

    if (res.Result === "SignInFailure") {
      throw "Incorrect code, try again.";
    }

    console.error(res);
    throw "Unexpected error, try again.";
  }
}

module.exports = Newegg;
