/**
 * =====================================================
 *  ChilledCatBot - Games Module
 *  Shows available games with Play Now buttons
 * =====================================================
 */

const { Markup } = require("telegraf");
const { GAMES } = require("./games");

function setupGames(bot) {
  bot.command("games", async (ctx) => {
    try {
      const rows = Object.entries(GAMES).map(([key, game]) => [
        Markup.button.url(
          `🎮 Play ${game.title}`,
          game.url || `https://chilledcatbot-server.onrender.com/games/${key}`
        ),
      ]);

      await ctx.replyWithMarkdown(
        "😺 *Available Chilled Cat Games:*\n" +
          "Click below to play directly!\n\n" +
          Object.values(GAMES)
            .map((g) => `🎮 *${g.title}*\n${g.description || "No description."}`)
            .join("\n\n"),
        Markup.inlineKeyboard(rows)
      );
    } catch (err) {
      console.error("⚠️ Failed to send games list:", err);
      ctx.reply("⚠️ Could not load games list right now.");
    }
  });

  console.log("🎮 Games module loaded (popup links active).");
}

module.exports = { setupGames };
