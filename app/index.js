"use strict";

const Discord = require("discord.js");
const mongoose = require("mongoose");
const Job = require("./api/job");
const Credential = require("./api/credential");
const Test = require("./api/test");
const Proxy = require("./modules/proxy");
const bot = new Discord.Client();

const url = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_URL}?retryWrites=true&w=majority`;
bot.login(process.env.TOKEN);

/**
 * Catch messages sent on discord
 */
bot.on("message", async (msg) => {
  // only catch dm messages
  if (msg.channel.type !== "dm") return;

  // dont catch messages sent by this bot
  if (msg.author.username === bot.user.username) return;

  let userId = msg.author.id;
  msg = msg.content;

  if (msg.includes("★")) return;

  if (msg.includes("!credential")) {
    let usage =
      "Usage: ```!credential store email password proxy cardnumber mmyy cvv```" +
      "Card Number and expiration date are needed for some stores." +
      "Try adding credentials without these two first. I will tell you if they are necessary.";

    if (msg === "!credential") {
      return sendDm(usage, userId);
    }

    msg = msg.replace("!credential ", "");
    msg = msg.split(" ");

    if (msg.length !== 5 && msg.length !== 7) {
      return sendDm(usage, userId);
    }

    sendDm("Verifying credential...", userId);

    try {
      await Credential("set", userId, msg);
    } catch (e) {
      if (e === "verification") {
        return sendDm(
          "You received a verificion code in your authenticator, enter it: ```!verify code```",
          userId
        );
      }

      if (e === "invalid store") {
        return sendDm(
          "To see a list of valid stores type: ```!stores```",
          userId
        );
      }

      return sendDm(e, userId);
    }

    return sendDm(
      "You can now autobuy products from " + msg[0] + ".```!start URL```",
      userId
    );
  }

  if (msg.includes("!verify")) {
    let usage = "Usage: ```!verify code```";

    if (msg === "!verify") {
      return sendDm(usage, userId);
    }

    let code = msg.replace("!verify ", "");

    sendDm("Please wait...", userId);

    try {
      await Credential("verify", userId, [code]);
    } catch (e) {
      return sendDm(e, userId);
    }
    return sendDm(
      "You can now auto-buy products from this store.```!start URL```",
      userId
    );
  }

  // start a monitor
  if (msg.includes("!start")) {
    let usage =
      "This command starts a monitor with or without auto-buy:" +
      "```!start URL```" +
      "```!start autobuy URL```";

    if (msg === "!start") {
      return sendDm(usage, userId);
    }

    msg = msg.replace("!start ", "");
    msg = msg.split(" ");

    if (msg.length !== 1 && msg.length !== 2) {
      return sendDm(usage, userId);
    }

    if (msg.length === 2 && msg[0] !== "autobuy") {
      return sendDm(usage, userId);
    }

    if (msg.length === 2 && msg[0] === "autobuy") {
      var autobuy = true;
    }

    // if only url is passed, make autobuy argument null
    if (msg.length === 1) {
      msg = [null, msg[0]];
    }

    sendDm("Starting monitor...", userId);

    try {
      await Job("start", userId, msg);
    } catch (e) {
      console.error(e);
      return sendDm(e, userId);
    }

    if (autobuy) {
      return sendDm("Monitor with auto-buy successfully started.", userId);
    }

    return sendDm("Monitor successfully started.", userId);
  }

  if (msg.includes("!test")) {
    if (msg === "!test") {
      return sendDm("Usage: ```!test URL```", userId);
    }

    let url = msg.replace("!test ", "");

    sendDm("Testing auto-buy...", userId);

    try {
      await Test(userId, url);
    } catch (e) {
      return sendDm(e, userId);
    }
    return sendDm("Auto-buy is working as expected.", userId);
  }

  if (msg.includes("!stop")) {
    let usage = "Usage:```!stop store itemID```";

    if (msg === "!stop") {
      return sendDm(usage, userId);
    }

    msg = msg.replace("!stop ", "");
    msg = msg.split(" ");

    if (msg.length !== 2) {
      return sendDm(usage, userId);
    }

    try {
      await Job("stop", userId, msg);
    } catch (e) {
      return sendDm(e, userId);
    }
    return sendDm("Auto-buy successfully stopped.", userId);
  }

  if (msg.includes("!mylist")) {
    if (msg === "!mylist") {
      return sendDm("Usage: ```!mylist store```", userId);
    }

    let store = msg.replace("!mylist ", "");

    let list = await Job("myList", userId, [store]);
    if (list.length === 0) {
      return sendDm(
        "You don't have any items on auto-buy for this store.",
        userId
      );
    }

    for (let item of list) {
      const embed = {
        title: item.title,
        description: `Item ID: ${item.itemId}`,
        url: item.url,
        //color: 12745742,
      };
      sendDm({ embed }, userId);
    }
    return;
  }

  if (msg === "!list") {
    let map = await Job("list", userId, []);
    if (!map) {
      return sendDm("I am not tracking any products.", userId);
    }

    for (let [store, array] of map) {
      for (let obj of array) {
        let msg = `Store: ${store}\nItemID: ${obj.itemId}\nURL: ${obj.url}`;
        sendDm(msg, userId);
      }
    }
    return;
  }
});

function sendDm(msg, userId) {
  try {
    bot.users.cache.get(userId).send(msg);
  } catch (error) {
    console.error(error);
  }
}

bot.on("ready", async () => {
  // Restore Jobs
  console.log("Connecting to DB...");
  await mongoose.connect(url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
  });

  console.log("Getting proxies...");
  await Proxy.fetch();

  if (process.env.NODE_ENV === "production") {
    console.log("Restoring jobs...");
    await Job("restore");
  }

  console.log("Bot is ready.");
});
