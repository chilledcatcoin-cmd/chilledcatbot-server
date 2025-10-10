/**
 * =====================================================
 * Chilled Cat Stats Scheduler + Manual Triggers
 * =====================================================
 */

const cron = require("node-cron");
const { postHourlyStats } = require("./dailystats");

/**
 * Initializes scheduled and manual update commands
 */
function setupDailyStats(bot) {
  // ✅ Schedule: every hour at minute 0
  cron.schedule("0 * * * *", async () => {
    console.log("⏰ Running hourly Chilled Cat stats update...");
    await postHourlyStats(bot);
  });

  // ✅ Manual trigger
  bot.command("hourlyupdate", async (ctx) => {
    await ctx.reply("📊 Manually triggering Chilled Cat stats update...");
    await postHourlyStats(bot);
    await ctx.reply("✅ Manual update completed. Next update in 1 hour.");
  });

  // ✅ Check last stats
  bot.command("checkstats", async (ctx) => {
    try {
      const { Redis } = require("@upstash/redis");
      const redis = new Redis({
        url: process.env.UPSTASH_URL,
        token: process.env.UPSTASH_TOKEN,
      });
      const raw = await redis.get("chilledcat:stats");

      if (!raw) {
        await ctx.reply("⚠️ No data yet — fetching first stats snapshot...");
        await postHourlyStats(bot);
        return ctx.reply("✅ Initial stats snapshot pulled! Next update in 1 hour.");
      }

      const data = JSON.parse(raw);
      const timestamp = new Date(data.timestamp).toISOString().replace("T", " ").split(".")[0] + " UTC";
      await ctx.replyWithMarkdown(
        `📊 *Last Chilled Cat Stats Snapshot*\n\n🕒 *Last Updated:* ${timestamp}`
      );
    } catch (err) {
      console.error("❌ /checkstats error:", err.message);
      await ctx.reply("❌ Failed to load stats data.");
    }
  });

  console.log("✅ Daily Stats feature initialized");
}

module.exports = { setupDailyStats };
