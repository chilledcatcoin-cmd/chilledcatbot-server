/**
 * =====================================================
 * ChilledCatBot - Games Module Entry
 * =====================================================
 */

// /features/games/index.js
const { listGames } = require("./games");

function setupGames(bot) {
  bot.command("games", (ctx) => {
    ctx.replyWithMarkdown(
      "😺 *Available Chilled Cat Games:*\n\n" + listGames(),
      { disable_web_page_preview: false }
    );
  });

  console.log("🎮 Games feature loaded.");
}

module.exports = { setupGames };

