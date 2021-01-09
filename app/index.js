"use strict";

const Discord = require("discord.js");
const mongoose = require("mongoose");
const emitter = require("./modules/emitter");
const Job = require("./api/job");
const Credential = require("./api/credential");
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
    let usage = "Usage: ```!credential store username password cvv```";

    if (msg === "!credential") {
      return sendDm(usage, userId);
    }

    msg = msg.replace("!credential ", "");
    msg = msg.split(" ");

    if (msg.length !== 4) {
      return sendDm(usage, userId);
    }

    sendDm("Verifying credential...", userId);

    try {
      await Credential.set(userId, ...msg);
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
      "You can now autobuy products from" + msg[0] + ".```!autobuy URL```",
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
      await Credential.verify(userId, code);
    } catch (e) {
      return sendDm(e, userId);
    }
    return sendDm(
      "You can now auto-buy products from this store.```!autobuy URL```",
      userId
    );
  }

  if (msg.includes("!autobuy")) {
    if (msg === "!autobuy") {
      return sendDm("Usage: ```!autobuy URL```", userId);
    }

    let url = msg.replace("!autobuy ", "");

    sendDm("Creating auto-buy...", userId);

    try {
      await Job.start(userId, url);
    } catch (e) {
      return sendDm(e, userId);
    }
    return sendDm("Auto-buy successfully set.", userId);
  }

  if (msg.includes("!stopautobuy")) {
    let usage = "Usage:```!stopautobuy store itemID```";

    if (msg === "!stopautobuy") {
      return sendDm(usage, userId);
    }

    msg = msg.replace("!stopautobuy ", "");
    msg = msg.split(" ");

    if (msg.length !== 2) {
      return sendDm(usage, userId);
    }

    try {
      await Job.stop(userId, ...msg);
    } catch (e) {
      sendDm(e, userId);
    }
    return sendDm("Auto-buy successfully stopped.", userId);
  }

  if (msg === "!list") {
    let map = await Job.list();
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

function sendMessage(msg) {
  try {
    bot.channels.cache.get(process.env.CHANNELID).send(msg);
  } catch (e) {
    console.error("Couldn't send message to this channel");
  }
}

function sendDm(msg, userId) {
  console.log(msg)
  try {
    bot.users.cache.get(userId).send(msg);
  } catch (error) {
    console.error("Couldn't send a DM to this user");
  }
}

/**
 * Catch and handle any events
 */
function events() {
  emitter.on("autobuy-finished", async (results) => {
    let rejected = results.get("rejected");
    let fulfilled = results.get("fulfilled");
    let total = rejected.length + fulfilled.length;

    let gotOne = "";
    for (let userId of fulfilled) {
      gotOne += (await getUsername(userId)) + ", ";
    }
    gotOne = gotOne.slice(0, -2);

    let didntGetOne = "";
    for (let value of rejected) {
      didntGetOne += (await getUsername(value.userId)) + ", ";
    }
    didntGetOne = didntGetOne.slice(0, -2);

    const embed = {
      title: "Purchases Results",
      timestamp: new Date(),
    };

    let fields = [];
    if (gotOne) {
      fields.push({
        name: "Users who got one",
        value: gotOne,
      });
    }

    if (didntGetOne) {
      fields.push({
        name: "Users who didn't get one",
        value: didntGetOne,
      });
    }

    embed.fields = fields;

    if (rejected.length === total) {
      embed.description = "I suck, I wasn't able to buy one for any user.";
      embed.color = 15158332; //red
      return sendMessage({ embed });
    }

    if (fulfilled.length === total) {
      embed.description = "I am god, I bought one for every user.";
      embed.color = 3066993; //greed
      return sendMessage({ embed });
    }

    embed.description = "I wasn't able to buy one for every user";
    embed.color = 10181046; //purple
    return sendMessage({ embed });
  });

  emitter.on("autobuyer-start", (values) => {
    const embed = {
      title: "Product is in stock, I am attemping purchases now!",
      description: `[${values.title}](${values.url})`,
      color: 12745742,
      timestamp: new Date(),
    };

    sendMessage({ embed });
  });
}

async function getUsername(userId) {
  if (bot.users.cache.get(userId)) {
    return bot.users.cache.get(userId).username;
  }

  try {
    let user = await bot.users.fetch(userId);
    return user.username;
  } catch (e) {
    return null;
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

  console.log("Restoring jobs...");
  await Job.restore();
  events();
  console.log("Bot is ready.");
});
