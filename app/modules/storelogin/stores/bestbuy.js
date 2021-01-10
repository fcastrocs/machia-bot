"use strict";

const Base = require("../base");

const LOGIN_URL = "https://www.bestbuy.com/identity/global/signin";

class Bestbuy extends Base {
  constructor(userId, email, password, cvv, page) {
    super(userId, "bestbuy", email, password, cvv, page);
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
    }

    // Enter email
    let input = await this.page.waitForSelector("#fld-e");
    await input.type(this.email);

    // Enter password
    input = await this.page.waitForSelector("#fld-p1");
    await input.type(this.password);

    // Remember me checkbox
    input = await this.page.waitForSelector("#ca-remember-me");
    await input.click();

    let btn = await this.page.waitForSelector("[data-track='Sign In']");

    //click submit button
    let p = await Promise.all([
      this.page.waitForResponse((req) =>
        req.url().includes("identity/authenticate")
      ),
      await btn.click(),
    ]);

    // get response
    let res = await p[0].json();

    // successful login
    if (res.status === "success") {
      this.cookies = await this.page.cookies();
      return;
    }
    // check for credential errors
    if (res.status === "failure") {
      throw "Bad credentials, try again.";
    }

    console.error(res);
    throw "Unexpected error, try again.";
  }

  async verifyLogin(code) {
    console.log(code);
  }
}

module.exports = Bestbuy;
