/**
 * =====================================================
 *  Chilled Cat Fortune Module
 *  Author: Derek Sheppard
 *  Purpose: Adds /fortune command to ChilledCatBot
 *  Notes:
 *    - Loads random fortune from cc_fortunes.js
 *    - Uses a chill 90s-style flair for replies
 * =====================================================
 */

const fortunes = require("./cc_fortunes");

function setupFortune(bot) {
  bot.command("fortune", (ctx) => {
    if (!fortunes || fortunes.length === 0) {
      ctx.reply("😿 The yarn ball of destiny is tangled. No fortune today.");
      return;
    }

    const fortune = fortunes[Math.floor(Math.random() * fortunes.length)];

    ctx.reply(
      `🔮 The Chilled Cat peers into the yarn ball of destiny...\n\n${fortune}`
    );
  });
}

module.exports = { setupFortune };
