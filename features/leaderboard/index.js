/**
 * =====================================================
 * ChilledCatBot - Leaderboard Module Entry
 * =====================================================
 */

const { GAMES } = require("../games/");
const { getLeaderboardCached, getStatName } = require("./leaderboard");

function setupLeaderboard(bot) {
  bot.command("leaderboard", async (ctx) => {
    const parts = ctx.message.text.split(" ");
    const game = parts[1];

    if (!game || !GAMES[game]) {
      return ctx.reply("Usage: /leaderboard <flappycat|catsweeper>");
    }

    try {
      const list = await getLeaderboardCached(getStatName("global", game));
      if (!list || list.length === 0) {
        return ctx.reply("📭 No leaderboard data yet. Be the first to play!");
      }

      let msg = `🏆 *${GAMES[game].title} — Global Leaderboard*\n\n`;
      list.forEach((e, i) => {
        msg += `${i + 1}. ${e.DisplayName || "Anonymous"} — ${e.StatValue}\n`;
      });

      await ctx.replyWithMarkdown(msg);
    } catch (err) {
      console.error("⚠️ Leaderboard fetch failed:", err);
      await ctx.reply("⚠️ Could not fetch leaderboard at this time.");
    }
  });

  console.log("📊 Leaderboard module loaded.");
}

module.exports = { setupLeaderboard };
