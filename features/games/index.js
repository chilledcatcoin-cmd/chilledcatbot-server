/**
 * =====================================================
 * ChilledCatBot - Games Module (Telegram Native Games)
 * Dynamically lists and launches all registered games.
 * =====================================================
 */

const { GAMES } = require("./games");
const { Markup } = require("telegraf");

function setupGames(bot) {
  /**
   * /games — show all games with native Play buttons
   */
  bot.command("games", async (ctx) => {
    try {
      const keyboard = Object.entries(GAMES).map(([key, game]) => [
        {
          text: `🎮 Play ${game.title}`,
          callback_game: {}, // 🧠 key change here
        },
      ]);

      const text =
        "😺 *Chilled Cat Game Hub*\n\n" +
        "Select a game below to play inside Telegram:\n\n" +
        Object.values(GAMES)
          .map(
            (g) =>
              `🎮 *${g.title}*\n${g.description || "No description available."}`
          )
          .join("\n\n");

      await ctx.replyWithMarkdown(text, {
        reply_markup: { inline_keyboard: keyboard },
      });
    } catch (err) {
      console.error("⚠️ Failed to send games list:", err);
      await ctx.reply("⚠️ Could not load games list right now.");
    }
  });

  /**
   * /flappycat, /catsweeper — open native Telegram game cards
   */
  Object.entries(GAMES).forEach(([key, game]) => {
    bot.command(key, async (ctx) => {
      try {
        await ctx.replyWithGame(key, {
          reply_markup: {
            inline_keyboard: [
              [{ text: `🎮 Play ${game.title}`, callback_game: {} }],
            ],
          },
        });
      } catch (err) {
        console.error(`⚠️ Failed to send game card for ${key}:`, err);
        await ctx.reply(`⚠️ Could not open ${game.title} right now.`);
      }
    });
  });

  /**
   * Unified callback handler — handles all native game launches
   */
  bot.on("callback_query", async (ctx, next) => {
    try {
      const gameName = ctx.callbackQuery?.game_short_name;
      if (gameName && GAMES[gameName]) {
        await ctx.answerGameQuery(GAMES[gameName].url);
        console.log(`🎮 Game launched: ${gameName}`);
        return;
      }
      return next();
    } catch (err) {
      console.error("🎮 Game callback error:", err);
      return next();
    }
  });

  console.log("🎮 Games module loaded (Native Play buttons active).");
}

module.exports = { setupGames };
