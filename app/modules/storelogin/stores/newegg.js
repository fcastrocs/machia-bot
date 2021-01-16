"use strict";

const Base = require("../base");

const STORE_URL = "https://www.newegg.com/";
const LOGIN_URL = "https://secure.newegg.com/NewMyAccount/AccountLogin.aspx";

class Newegg extends Base {
  constructor(userId, email, password, cvv, page) {
    super(userId, "newegg", email, password, cvv, page);

    this.secondLogin = false;
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
      await this.page.goto(STORE_URL, { waitUntil: "load" });
      await this.page.goto(LOGIN_URL, { waitUntil: "load" });
    }

    // wait for recaptcha
    if (!this.autoBuyerRequest) {
      await this.page.waitForTimeout(30000);
    }

    // Enter email
    await this.page.type("input[name=signEmail]", this.email);
    await this.page.keyboard.press("Tab");

    //click submit button
    let p = await Promise.all([
      this.page.waitForResponse((req) =>
        req.url().includes("CheckLoginName?ticket")
      ),
      this.page.keyboard.press("Enter"),
    ]);

    let res = await p[0].json();

    // check for credential errors
    if (res.Result === "SignInFailure") {
      throw "Bad credentials.";
    }

    // verfication needed
    if (res.Result === "ReCaptchaFailed") {
      throw "Recaptcha failed.";
    }

    // some other error occurred
    if (res.Result !== "Success") {
      console.error(res);
      throw "Unexpected error.";
    }

    // Enter password
    await this.page.type("input[name=password]", this.password);
    await this.page.keyboard.press("Tab");

    // Auto-buyer login should not require code verificaiton.
    if (!this.autoBuyerRequest) {
      var verification = this.page.waitForResponse((res) =>
        res.url().includes("identity/2sverification")
      );
    }

    // click submit button
    p = await Promise.allSettled([
      this.page.waitForResponse((res) => res.url().includes("SignIn?ticket")),
      this.page.keyboard.press("Enter"),
    ]);

    try {
      res = await p[0].json();
    } catch (e) {
      // empty response means either 2FA or successfull login
      var noresponse = true;
    }

    // There was a response
    if (!noresponse) {
      if (res.Result === "SignInFailure") {
        throw "Bad credentials.";
      }

      console.error(res);
      throw "Unexpected error.";
    }

    if (this.autoBuyerRequest) {
      return;
    }

    // Require the account to have verification
    try {
      await verification;
    } catch (e) {
      throw "For your security, setup 2FA to your account, try again.";
    }
    throw "verification";
  }

  async verifyLogin(code) {
    if (code.length !== 6) {
      throw "Incorrect code, try again.";
    }

    // Remember checkbox
    let box = await this.page.waitForSelector(".form-checkbox-title");
    await box.click();

    await this.page.type('input[aria-label="verify code 1"]', code.charAt(0));
    await this.page.type('input[aria-label="verify code 2"]', code.charAt(1));
    await this.page.type('input[aria-label="verify code 3"]', code.charAt(2));
    await this.page.type('input[aria-label="verify code 4"]', code.charAt(3));
    await this.page.type('input[aria-label="verify code 5"]', code.charAt(4));
    await this.page.type('input[aria-label="verify code 6"]', code.charAt(5));

    await this.page.keyboard.press("Tab");

    let p = await Promise.all([
      this.page.waitForResponse((req) =>
        req.url().includes("/api/VerifyTwoStepCode")
      ),
      this.page.waitForNavigation({ waitUntil: "networkidle0" }),
      this.page.keyboard.press("Enter"),
    ]);

    try {
      var res = await p[0].json();
    } catch (e) {
      // login successfull, empty response
      this.cookies = await this.page.cookies();
      return;
    }

    if (res.Result === "TwoStepServiceError") {
      throw "Incorrect code, try again.";
    }

    console.error(res);
    throw "Unexpected error, try again.";
  }
}

module.exports = Newegg;
