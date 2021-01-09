module.exports = {
  name: "machia-bot",
  script: "./app/index.js",
  time: true,
  env_development: {
    NODE_ENV: "development",

    // Discord variables
    TOKEN: "",
    CHANNELID: "",

    DB_URL: "",
    DB_USERNAME: "",
    DB_PASSWORD: "",
    ENCRYPTION_KEY: "",

    PURCHASE_RETRY: 3,
    ADDTOCARD_RETRY: 10,
    SCRAPE_INTERVAL: 3000,

    RESIDENTIAL_PROXY: "0.0.0.0:00000",
    // PROXY SERVICE USED FOR SCRAPING
    PROXY_SERVICE_URL: "",
  },
  env_production: {
    NODE_ENV: "production",

    // Discord variables
    TOKEN: "",
    CHANNELID: "",

    DB_URL: "",
    DB_USERNAME: "",
    DB_PASSWORD: "",
    ENCRYPTION_KEY: "",

    PURCHASE_RETRY: 3,
    ADDTOCARD_RETRY: 10,
    SCRAPE_INTERVAL: 3000,

    RESIDENTIAL_PROXY: "0.0.0.0:00000",
    // PROXY SERVICE USED FOR SCRAPING
    PROXY_SERVICE_URL: "",
  },
};
