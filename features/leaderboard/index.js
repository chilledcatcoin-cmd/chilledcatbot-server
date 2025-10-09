/**
 * =====================================================
 * ChilledCatBot - Leaderboard Module Entry
 * =====================================================
 */

const { getLeaderboardCached, getStatName } = require("./leaderboard");

  bot.command("leaderboard", async (ctx) => {
    const parts = ctx.message.text.split(" ");
    const game = parts[1];
    if (!game || !GAMES[game]) {
      return ctx.reply("Usage: /leaderboard <flappycat|catsweeper>");
    }

    try {
      const list = await getLeaderboardCached(getStatName("global", game));
      if (!list.length) return ctx.reply("No leaderboard data yet.");

      let msg = `🏆 *${GAMES[game].title} — Global Leaderboard*\n\n`;
      list.forEach((e, i) => {
        msg += `${i + 1}. ${e.DisplayName || "Anonymous"} — ${e.StatValue}\n`;
      });

      ctx.replyWithMarkdown(msg);
    } catch (err) {
      console.error("Leaderboard fetch failed:", err);
      ctx.reply(⚠️ Could not fetch leaderboard at this time.");
    }
  });

module.exports = { getLeaderboardCached, getStatName };
