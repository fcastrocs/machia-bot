"use strict";

const Base = require("../base");

const LOGIN_URL = "https://www.bhphotovideo.com";

class Bhphotovideo extends Base {
  constructor() {
    super("bhphotovideo");
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

      // it seems a mouse click is needed to beat anti-bot system.
      await this.page.waitForTimeout(2000);
      await this.page.mouse.move(123, 32);
      await this.page.mouse.move(1210, 543);
      await this.page.waitForTimeout(2500);

      // hover over account box
      await this.page.waitForSelector(".user.login-account", {
        visible: true,
      });

      await this.page.hover(".user.login-account");
      await this.page.waitForTimeout(1500);

      // open login modal
      let [btn] = await this.page.$x("//button[contains(., 'Log In')]", {
        visible: true,
      });

      let box = await btn.boundingBox();
      await this.page.mouse.click(box.x, box.y, { delay: 500 });
    }
    await this.page.waitForTimeout(2000);

    // Enter email
    await this.page.click("#user-input");

    await this.page.type("#user-input", this.email);
    await this.page.waitForTimeout(500);
    await this.page.keyboard.press("Tab");

    // Enter password
    await this.page.type("#password-input", this.password);
    await this.page.keyboard.press("Tab");

    //click submit button
    let p = await Promise.all([
      this.page.waitForResponse((req) =>
        req.url().includes("?Q=json&A=logMeIn")
      ),
      this.page.keyboard.press("Enter"),
    ]);

    if (p[0].status() !== 200) {
      console.error(p[0]);
      throw "Unexpected error, try again.";
    }

    try {
      var res = await p[0].json();
    } catch (error) {
      // successful login
      return await this.page.cookies();
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
