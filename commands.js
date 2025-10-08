/**
 * =====================================================
 * ChilledCatBot - Commands - commands.js
 * Registers all commands for games, contests, and features
 * =====================================================
 */

const { GAMES } = require("./games");
const { getLeaderboardCached } = require("./leaderboard");
const { contests } = require("./contests");

function setupCommands(bot) {
  // 🎮 Game commands
  bot.command("flappycat", ctx => ctx.reply("🐾 Launching Flappy Cat..."));
  bot.command("catsweeper", ctx => ctx.reply("💣 Launching CatSweeper..."));

  // 🏆 Leaderboard
  bot.command("leaderboard", async ctx => {
    const args = ctx.message.text.split(" ").slice(1);
    const game = args[0] || "flappycat";
    const scope = args[1] || "global";

    if (!GAMES[game]) return ctx.reply("Usage: /leaderboard <flappycat|catsweeper> [global|group|contest]");

    try {
      const data = await getLeaderboardCached(game, scope, ctx.chat.id);
      return ctx.reply(data || "No leaderboard data yet!");
    } catch (err) {
      console.error("❌ Leaderboard error:", err);
      return ctx.reply("Error fetching leaderboard.");
    }
  });

  // 🎯 Contest status
  bot.command("contest", ctx => {
    const c = contests.get(ctx.chat.id);
    if (!c) return ctx.reply("No active contest right now.");
    ctx.reply(`🎮 ${c.game} contest active!\n⏰ Ends in ${Math.ceil((c.expires - Date.now()) / 1000)}s.`);
  });
}

module.exports = { setupCommands };