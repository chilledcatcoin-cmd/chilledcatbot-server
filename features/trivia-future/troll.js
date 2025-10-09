// /modules/Trivia/troll.js
//
// 🎲 /troll — a playful tiebreaker command for Trivia
// ---------------------------------------------------
// Now context-aware: detects if a trivia session is running
// and changes message flavor accordingly 😼
// ---------------------------------------------------

const { activeGames } = require("./state");
const recentTrolls = new Map(); // cooldown map

function setupTroll(bot) {
  bot.command("troll", async (ctx) => {
    const chatId = ctx.chat.id;
    const userId = ctx.from.id;
    const now = Date.now();

    // 🕒 5-second cooldown per user
    if (recentTrolls.has(userId) && now - recentTrolls.get(userId) < 5000) {
      return ctx.reply("😼 Chill out! You just trolled — wait a few seconds...");
    }
    recentTrolls.set(userId, now);

    // 🎯 Check if a trivia game is active in this chat
    const triviaActive = !!activeGames[chatId];
    const roll = Math.floor(Math.random() * 100) + 1;
    const name = ctx.from.first_name || ctx.from.username || "Player";

    // 🎭 Context-based flavor
    let context;
    if (triviaActive) {
      context = "🎯 Trivia Tiebreak! Let fate decide the chillest cat...";
    } else {
      const chaosLines = [
        "😹 Random Cat Energy Detected!",
        "🧊 The Chill Dice roll in mysterious ways...",
        "🐾 Just vibin’ and trollin’!",
        "💥 The TON of luck strikes again!",
        "😼 RNGesus approves this roll!"
      ];
      context = chaosLines[Math.floor(Math.random() * chaosLines.length)];
    }

    // suspense effect
    await ctx.reply("🎲 *Rolling the troll dice...*", { parse_mode: "Markdown" });
    setTimeout(() => {
      ctx.reply(`${context}\n${name} rolls a *${roll}* 😼`, {
        parse_mode: "Markdown"
      });
    }, 1500);
  });

  console.log("🎲 /troll command loaded (context-aware)");
}

module.exports = { setupTroll };
