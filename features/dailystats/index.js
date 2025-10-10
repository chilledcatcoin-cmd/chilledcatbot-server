const cron = require("node-cron");
const { postHourlyStats } = require("./dailystats");

function setupDailyStats(bot) {
  cron.schedule("0 * * * *", async () => {
    console.log("⏰ Hourly Chilled Cat stats update triggered...");
    await postHourlyStats(bot);
  });

  bot.command("hourlyupdate", async (ctx) => {
    await ctx.reply("📊 Manually triggering Chilled Cat stats update...");
    await postHourlyStats(bot);
    await ctx.reply("✅ Manual update completed.");
  });

  bot.command("checkstats", async (ctx) => {
    await ctx.reply("ℹ️ Fetching last stats snapshot...");
    await postHourlyStats(bot);
  });

  console.log("✅ Daily Stats feature initialized");
}

module.exports = { setupDailyStats };
