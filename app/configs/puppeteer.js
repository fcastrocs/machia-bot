const options = {
  slowMo: 25,
  headless: process.env.NODE_ENV === "production" ? true : false,
};

module.exports = options;
