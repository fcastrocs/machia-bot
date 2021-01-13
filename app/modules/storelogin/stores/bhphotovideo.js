"use strict";

const Base = require("../base");

const LOGIN_URL = "https://www.bhphotovideo.com";

class Bhphotovideo extends Base {
  constructor(userId, email, password, cvv, page) {
    super(userId, "bhphotovideo", email, password, cvv, page);
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
      await this.page.goto(LOGIN_URL, {waitUntil: 'networkidle0'});
    }

    await this.page.waitForTimeout(1000);

    // hover over account box
    await this.page.waitForSelector(".user.login-account", { visible: true });
    await this.page.hover(".user.login-account");

    await this.page.waitForTimeout(1000);

    // open login modal
    let [btn] = await this.page.$x("//button[contains(., 'Log In')]", {
      visible: true,
    });
    await btn.click();

    await this.page.waitForTimeout(1000);

    // Enter email
    let input = await this.page.waitForSelector("#user-input");
    await input.type(this.email);

    // Enter password
    input = await this.page.waitForSelector("#password-input");
    await input.type(this.password);

    btn = await this.page.waitForSelector('input[data-selenium="submitBtn"]');

    //click submit button
    let p = await Promise.all([
      this.page.waitForResponse((req) =>
        req.url().includes("?Q=json&A=logMeIn")
      ),
      await btn.click(),
    ]);

    if (p[0].status() !== 200) {
      console.error(p[0]);
      throw "Unexpected error, try again.";
    }

    try {
      var res = await p[0].json();
    } catch (error) {
      // successful login
      this.cookies = await this.page.cookies();
      return;
    }

    if (res.status === "error") {
      throw "Bad credentials, try again.";
    }

    console.error(res);
    throw "Unexpected error, try again.";
  }

  async verifyLogin(code) {
    console.log(code);
    return;
  }
}

module.exports = Bhphotovideo;
