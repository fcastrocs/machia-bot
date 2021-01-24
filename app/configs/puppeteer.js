const options = {
  slowMo: 25,
  headless: process.env.NODE_ENV === "production" ? true : true,
};

module.exports = options;
