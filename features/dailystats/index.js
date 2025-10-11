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
const { Redis } = require("@upstash/redis");
const { postHourlyStats } = require("./dailystats");
const { canAccess } = require("../../modules/safecat/protector");

// ✅ Upstash Redis client
const redis = new Redis({
  url: process.env.UPSTASH_URL,
  token: process.env.UPSTASH_TOKEN,
});

async function setupDailyStats(bot) {
  const TEST_CHANNEL_ID = "-4873969981"; // Chilled Cat Testing group
  console.log(`📡 DailyStats active — posting to test channel ${TEST_CHANNEL_ID}`);

  /* -------------------------------
     🕒 Hourly Scheduled Update
     ------------------------------- */
  cron.schedule("0 * * * *", async () => {
    const lockKey = "chilledcat:stats_lock";
    const isLocked = await redis.get(lockKey);
    if (isLocked) {
      console.log("🔒 Another stats update already running, skipping this round.");
      return;
    }

    await redis.set(lockKey, "true", { ex: 300 }); // lock for 5 min
    try {
      console.log("⏰ Hourly Chilled Cat stats update triggered...");
      await postHourlyStats(bot);
    } catch (err) {
      console.error("❌ Cron job failed:", err.message);
    } finally {
      await redis.del(lockKey);
    }
  });

  /* -------------------------------
     /hourlyupdate command (manual trigger)
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
     /checkstats command (READ ONLY)
     ------------------------------- */
  bot.command("checkstats", async (ctx) => {
    const user = ctx.from;
    if (!(await canAccess(user.id))) {
      return ctx.reply("🚫 Access denied — you’re not whitelisted to view stats.");
    }

    const snapshot = await redis.get("chilledcat:stats");
    if (!snapshot) {
      return ctx.reply("⚠️ No stats available yet. Please wait for the next hourly update.");
    }

    await ctx.reply(`📊 *Last Chilled Cat Stats Snapshot:*\n\n${snapshot}`, {
      parse_mode: "Markdown",
    });
  });

  console.log("✅ Daily Stats feature initialized (SafeCat-secured, test-only mode)");
}

module.exports = { setupDailyStats };
