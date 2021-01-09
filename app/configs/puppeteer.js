const options = {
  defaultViewport: null,
  slowMo: 20,
};

if (process.env.NODE_ENV === "production") {
  options.headless = true;
} else {
  options.headless = false;
}

options.args = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--single-process",
  `--proxy-server=http://${process.env.RESIDENTIAL_PROXY}`,
];

module.exports = options;
