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
      const keyboard = Object.entries(GAMES).map(([key, game]) => [
        Markup.button.callback(`🎮 Play ${game.title}`, `launch_${key}`),
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
   * /flappycat and /catsweeper — direct native Telegram games
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
   * Handle clicks on /games inline buttons (launch_*)
   * → reply with Telegram-native game card (so Telegram can open the webview)
   */
  bot.on("callback_query", async (ctx, next) => {
    try {
      const data = ctx.callbackQuery?.data;
      const gameName = ctx.callbackQuery?.game_short_name;

      // When pressing a "Play" button from /games
      if (data && data.startsWith("launch_")) {
        const key = data.replace("launch_", "");
        const game = GAMES[key];
        if (game) {
          await ctx.replyWithGame(key, {
            reply_markup: {
              inline_keyboard: [
                [{ text: `🎮 Play ${game.title}`, callback_game: {} }],
              ],
            },
          });
          console.log(`🎮 Sent game card for ${game.title}`);
          return;
        }
      }

      // When user presses native game button
      if (gameName && GAMES[gameName]) {
        await ctx.answerGameQuery(GAMES[gameName].url);
        console.log(`🎮 Launching game: ${gameName}`);
        return;
      }

      return next();
    } catch (err) {
      console.error("🎮 Game callback error:", err);
      return next();
    }
  });

  console.log("🎮 Games module loaded (Fixed Telegram Play buttons).");
}

module.exports = { setupGames };
