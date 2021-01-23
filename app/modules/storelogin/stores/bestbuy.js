"use strict";

const Base = require("../base");

const LOGIN_URL = "https://www.bestbuy.com/identity/global/signin";

class Bestbuy extends Base {
  constructor() {
    super("bestbuy");
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
      await this.page.goto(LOGIN_URL);

      // Enter email
      let input = await this.page.waitForSelector("#fld-e", { visible: true });
      await input.type(this.email);

      // Remember me checkbox
      input = await this.page.waitForSelector("#ca-remember-me");
      await input.click();
    }

    // Enter password
    let input = await this.page.waitForSelector("#fld-p1", { visible: true });
    await input.type(this.password);

    let btn = await this.page.waitForSelector("[data-track='Sign In']");

    //click submit button
    let p = await Promise.all([
      this.page.waitForResponse((req) =>
        req.url().includes("identity/authenticate")
      ),
      await btn.click(),
    ]);

    // get response
    try {
      var res = await p[0].json();
    } catch (error) {
      // successful login
      let context = await this.page.context();
      return await context.cookies();
    }

    // Sometimes it sends 'success' status? verify this later
    if (res.status === "success") {
      let context = await this.page.context();
      return await context.cookies();
    }

    if (res.status === "stepUpRequired") {
      throw "verification";
    }

    // check for credential errors
    if (res.status === "failure") {
      throw "Bad credentials, try again.";
    }

    console.error(res);
    throw "Unexpected error, try again.";
  }

  async verifyLogin(code) {
    if (code.length !== 6) {
      throw "Incorrect code, try again.";
    }

    let input = await this.page.waitForSelector("#verificationCode");
    await input.focus();
    // erase previous input
    for (let i = 0; i < 6; i++) {
      await this.page.keyboard.press("Backspace");
    }
    await input.type(code);

    let btn = await this.page.waitForSelector(
      'button[data-track="Two Step Verification Code - Continue"]'
    );

    let p = await Promise.all([
      this.page.waitForResponse((req) =>
        req.url().includes("identity/verifyTwoStep")
      ),
      btn.click(),
    ]);

    //sometimes request doesn't return anything and this json() throws.
    try {
      var res = await p[0].json();
    } catch (e) {
      //successful verify
      let context = await this.page.context();
      return await context.cookies();
    }

    if (res.status === "success") {
      let context = await this.page.context();
      return await context.cookies();
    }

    if (res.status === "failure") {
      throw "Incorrect code, try again.";
    }

    console.error(res);
    throw "Unexpected error, try again.";
  }
}

module.exports = Bestbuy;
