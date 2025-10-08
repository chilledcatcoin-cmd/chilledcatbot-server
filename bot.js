/**
 * =====================================================
 * ChilledCatBot — bot.js
 * Base bot setup (webhook only)
 * =====================================================
 */

const { Telegraf } = require("telegraf");
const { setupCommands } = require("./commands");
const { setupHowChill } = require("./features/howchill");

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) throw new Error("❌ Missing BOT_TOKEN in environment");

const bot = new Telegraf(BOT_TOKEN);

// 👋 Basic test command
bot.start((ctx) => ctx.reply("😺 ChilledCatBot is alive and ready to chill!"));

// 🧊 Load first feature
setupCommands(bot);
setupHowChill(bot);

console.log("✅ HowChill feature loaded.");

module.exports = { bot };
