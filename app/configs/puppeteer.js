const options = {
  defaultViewport: null,
  slowMo: 50,
  ignoreHTTPSErrors: true,
};

if (process.env.NODE_ENV === "production") {
  options.headless = false;
} else {
  options.headless = true;
}

options.args = [
  "--window-size=1920,1080",
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--single-process",
  `--proxy-server=http://${process.env.RESIDENTIAL_PROXY}`,
];

module.exports = options;
