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
   * /games — show all games with Play buttons
   */
  bot.command("games", async (ctx) => {
    try {
      const keyboard = Object.entries(GAMES).map(([key, game]) => {
        return [Markup.button.callback(`🎮 Play ${game.title}`, `play_${key}`)];
      });

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
   * Individual commands for each game
   */
  Object.entries(GAMES).forEach(([key, game]) => {
    bot.command(key, async (ctx) => {
      try {
        await ctx.replyWithGame(key, {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: `Play ${game.title} — A Chilled Cat Game`,
                  callback_game: {},
                },
              ],
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
   * Callback handler for inline "Play" buttons from /games
   */
  bot.on("callback_query", async (ctx, next) => {
    const data = ctx.callbackQuery?.data;
    if (data && data.startsWith("play_")) {
      const key = data.replace("play_", "");
      const game = GAMES[key];
      if (game) {
        try {
          await ctx.answerGameQuery(game.url);
          return;
        } catch (err) {
          console.error("🎮 Game launch error:", err);
        }
      }
    }
    return next();
  });

  console.log("🎮 Games module loaded (Dynamic Chilled Cat Game Hub active).");
}

module.exports = { setupGames };
