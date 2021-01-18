const options = {
  defaultViewport: null,
  slowMo: 50,
  ignoreHTTPSErrors: true,
  args: [
    "--window-size=1920,1080",
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--single-process",
  ],
  headless: process.env.NODE_ENV === "production" ? true : false,
};

module.exports = options;
