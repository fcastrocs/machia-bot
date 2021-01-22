"use strict";

const Base = require("../base");

const LOGIN_URL = "https://arh.antoinevastel.com/bots/areyouheadless";

class Nike extends Base {
  constructor() {
    super("nike");
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
      await this.page.waitForTimeout(5000);
      await this.page.screenshot({ path: "example.png" });
    }

    return;

    let btn = await this.page.waitForSelector('button[data-path="sign in"]', {
      visible: true,
    });
    await btn.click();
    await this.page.waitForTimeout(1000);
    let input = await this.page.waitForSelector('input[name="emailAddress"]', {
      visible: true,
    });

    await input.type(this.email);
    await this.page.keyboard.press("Tab");
    await this.page.type('input[name="password"]', this.password);
    await this.page.keyboard.press("Tab");
    await this.page.keyboard.press("Enter");
    await this.page.waitForTimeout(5000);
    await this.page.screenshot({ path: "example.png" });
  }

  async verifyLogin(code) {
    console.log(code);
  }
}

module.exports = Nike;
