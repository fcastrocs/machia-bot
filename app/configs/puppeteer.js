const options = {
  defaultViewport: null,
  slowMo: 25,
  args: [
    "--window-size=1920,1080",
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--single-process",
  ],
  headless: process.env.NODE_ENV === "production" ? true : true,
};

module.exports = options;
