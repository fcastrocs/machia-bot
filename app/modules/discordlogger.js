const Discord = require("discord.js");
// logs channel
const webHookLogs = new Discord.WebhookClient(
  process.env.LOGS_CHANNELID,
  process.env.LOGS_TOKEN
);
// notifications channel
const webHookNotifications = new Discord.WebhookClient(
  process.env.NOTIFICATIONS_CHANNELID,
  process.env.NOTIFICATIONS_TOKEN
);

async function log(msg) {
  try {
    await webHookLogs.send(msg);
  } catch (e) {
    console.error("Couldn't log to discord.");
  }
}

async function notify(msg) {
  try {
    await webHookNotifications.send(msg);
  } catch (e) {
    console.error("Couldn't notify on discord.");
  }
}

async function onStockNotification(data) {
  const embed = new Discord.MessageEmbed();
  embed.setTitle("Product is on stock!!!");
  embed.setDescription(`[${data.title}](${data.url})`);
  embed.setColor(12745742);
  embed.setTimestamp();

  try {
    await webHookNotifications.send(embed);
  } catch (e) {
    console.error("Couldn't send on stock notification.");
  }
}

async function buyersNotification(results, title) {
  let rejected = results.get("rejected");
  let fulfilled = results.get("fulfilled");
  let total = rejected.length + fulfilled.length;

  let gotOne = "";
  for (let userId of fulfilled) {
    gotOne += `<@${userId}> `;
  }

  let didntGetOne = "";
  for (let value of rejected) {
    didntGetOne += `<@${value.userId}> `;
  }

  const embed = new Discord.MessageEmbed();
  embed.setTitle(`Auto-buyer Results for ${title}`);
  embed.setTimestamp();

  if (gotOne) {
    embed.addField("Users who got one", gotOne);
  }

  if (didntGetOne) {
    embed.addField("Users who didn't get one", didntGetOne);
  }

  if (rejected.length === total) {
    embed.setDescription("I wasn't able to buy one for any user.");
    embed.setColor(15158332); //red
  } else if (fulfilled.length === total) {
    embed.setDescription("I bought one for every user.");
    embed.setColor(3066993); //green
  } else {
    embed.setDescription("I wasn't able to buy one for every user");
    embed.setColor(10181046); //purple
  }

  try {
    await webHookNotifications.send(embed);
  } catch (e) {
    console.error("Couldn't send buyers notification.");
  }
}

module.exports = { log, onStockNotification, notify, buyersNotification };
