/**
 * =====================================================
 * ChilledCatBot - Games Module
 * Sends native Telegram Game cards and handles launches
 * =====================================================
 */

const { GAMES } = require("./games");

function setupGames(bot) {
  // 📜 Register individual game commands
  Object.entries(GAMES).forEach(([key, game]) => {
    bot.command(key, async (ctx) => {
      try {
        await ctx.replyWithGame(key, {
          reply_markup: {
            inline_keyboard: [[{ text: `Play ${game.title} — A Chilled Cat Game`, callback_game: {} }]],
          },
        });
      } catch (err) {
        console.error(`⚠️ Failed to send game card for ${key}:`, err);
        ctx.reply(`⚠️ Could not open ${game.title} right now.`);
      }
    });
  });

  // 🧠 Callback queries (when user presses “Play”)
  bot.on("callback_query", async (ctx, next) => {
    const data = ctx.callbackQuery?.game_short_name;
    if (data && GAMES[data]) {
      try {
        // Telegram expects this to open the game URL
        return ctx.answerGameQuery(GAMES[data].url);
      } catch (err) {
        console.error("🎮 Game launch error:", err);
      }
    }
    return next();
  });

  console.log("🎮 Games module loaded (Telegram Game Mode active).");
}

module.exports = { setupGames };
