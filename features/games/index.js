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
   * /games — show all games with working Play buttons
   */
  bot.command("games", async (ctx) => {
    try {
      const keyboard = Object.entries(GAMES).map(([key, game]) => [
        Markup.button.callback(`🎮 Play ${game.title}`, `play_${key}`),
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

      await ctx.replyWithMarkdown(text, Markup.inlineKeyboard(keyboard));
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
   * Unified callback handler — handles /games buttons and native game launches
   */
  bot.on("callback_query", async (ctx, next) => {
    try {
      const data = ctx.callbackQuery?.data;
      const gameName = ctx.callbackQuery?.game_short_name;

      // 🎮 Handle buttons from /games (callback_data)
      if (data && data.startsWith("play_")) {
        const key = data.replace("play_", "");
        const game = GAMES[key];
        if (game) {
          await ctx.answerGameQuery(game.url);
          console.log(`🎮 Game launched from /games: ${game.title}`);
          return;
        }
      }

      // 🕹️ Handle native game_short_name launches (/flappycat etc)
      if (gameName && GAMES[gameName]) {
        await ctx.answerGameQuery(GAMES[gameName].url);
        console.log(`🎮 Native game launch: ${gameName}`);
        return;
      }

      return next();
    } catch (err) {
      console.error("🎮 Game callback error:", err);
      return next();
    }
  });

  console.log("🎮 Games module loaded (Play buttons fixed and functional).");
}

module.exports = { setupGames };
