const options = {
  slowMo: 50,
  headless: process.env.NODE_ENV === "production" ? true : true,
  args: [],
};

module.exports = options;
