/**
 * =====================================================
 * Chilled Cat Daily Stats (SafeCat-secured, test-only mode)
 * =====================================================
 * - Uses SafeCat whitelist for manual commands
 * - Posts automatically once/hour to your test channel
 * - No cooldown (for development/testing)
 * =====================================================
 */

const cron = require("node-cron");
const { postHourlyStats } = require("./dailystats");
const { canAccess } = require("../../modules/safecat/protector");

async function setupDailyStats(bot) {
  // ✅ Your test group/channel ID only
  const TEST_CHANNEL_ID = "-4873969981"; // Chilled Cat Testing group
  console.log(`📡 DailyStats active — posting to test channel ${TEST_CHANNEL_ID}`);

  /* -------------------------------
     🕒 Hourly Scheduled Update (test mode)
     ------------------------------- */
  cron.schedule("0 * * * *", async () => {
    console.log("⏰ Hourly Chilled Cat stats update triggered (test mode)...");
    try {
      // Post only inside the test channel
      await postHourlyStats(bot);
    } catch (err) {
      console.error("❌ Cron job failed:", err.message);
    }
  });

  /* -------------------------------
     /hourlyupdate command
     ------------------------------- */
  bot.command("hourlyupdate", async (ctx) => {
    const user = ctx.from;
    if (!(await canAccess(user.id))) {
      return ctx.reply("🚫 Access denied — you’re not whitelisted to run this command.");
    }

    await ctx.reply("📊 Manually triggering Chilled Cat stats update (test mode)...");
    await postHourlyStats(bot);
    await ctx.reply("✅ Manual update completed in test mode.");
  });

  /* -------------------------------
     /checkstats command
     ------------------------------- */
  bot.command("checkstats", async (ctx) => {
    const user = ctx.from;
    if (!(await canAccess(user.id))) {
      return ctx.reply("🚫 Access denied — you’re not whitelisted to view stats.");
    }

    await ctx.reply("ℹ️ Fetching last stats snapshot (test mode)...");
    await postHourlyStats(bot);
  });

  console.log("✅ Daily Stats feature initialized (SafeCat-secured, test-only mode)");
}

module.exports = { setupDailyStats };
