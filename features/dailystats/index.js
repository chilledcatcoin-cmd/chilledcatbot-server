/**
 * =====================================================
 * Chilled Cat Stats Controller
 * =====================================================
 *  - Initializes hourly cron schedule
 *  - Registers /hourlyupdate command
 * =====================================================
 */

const cron = require("node-cron");
const { postHourlyStats } = require(".features/dailystats");

function initHourlyStats(bot) {
  // 🕒 Auto-post every hour
  cron.schedule("0 * * * *", () => postHourlyStats(bot));
  console.log("📅 Hourly Chilled Cat stats scheduled (every top of hour)");

  // 🧾 Manual command trigger
  bot.command("hourlyupdate", async (ctx) => {
    await ctx.reply("📊 Posting latest Chilled Cat stats...");
    await postHourlyStats(bot);
    await ctx.reply("✅ Stats posted!");
  });
}

module.exports = { initHourlyStats };
