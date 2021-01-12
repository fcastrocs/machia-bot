"use strict";

const Base = require("../base");

const STORE_URL = "https://www.nike.com/";

class Nike extends Base {
  constructor(userId, email, password, cvv, page) {
    super(userId, "nike", email, password, cvv, page);
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
      await this.page.goto(STORE_URL, { waitUntil: "networkidle0" });
    }

    let btn = await this.page.waitForSelector("button[data-path='sign in']", {
      visible: true,
    });
    await btn.click();

    // Enter email
    let input = await this.page.waitForSelector('input[name="emailAddress"]', {
      visible: true,
    });
    await input.type(this.email);

    // Enter password
    await this.page.keyboard.press("Tab");

    input = await this.page.waitForSelector('input[name="password"]');
    await input.type(this.password);

    btn = await this.page.waitForSelector('input[value="SIGN IN"]');

    //click submit button
    let p = await Promise.all([
      /*this.page.waitForResponse((res) => {
        console.log(res.url());
        console.log(res.status());
        console.log(res.headers());
        return false;
      }),*/
      btn.click(),
    ]);

    await this.page.waitFor(6000);

    await this.page.screenshot({path: 'example.png'});

    console.log("here4");

    /*(let status = await p[0].json();
    console.log(status);

    if (status === 200) {
      // login successfull
      this.cookies = await this.page.cookies();
      return;
    }

    console.log("here5");

    if (status === 401) {
      throw "Bad credentials, try again.";
    }

    let res = await p[0].json();
    console.log(res);
    throw "Unexpected error, try again.";*/
  }

  async verifyLogin(code) {
    console.log(code);
  }
}

module.exports = Nike;
