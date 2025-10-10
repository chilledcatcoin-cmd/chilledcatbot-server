/**
 * =====================================================
 * Chilled Cat Daily Stats Scheduler + Commands
 * =====================================================
 * Handles:
 *  - Hourly cron updates
 *  - /hourlyupdate manual trigger
 *  - /checkstats to view last snapshot
 * =====================================================
 */

const cron = require("node-cron");
const { postHourlyStats } = require("./dailystats");
const { Redis } = require("@upstash/redis");

// 🕒 Set up all stat-related commands and scheduling
function setupDailyStats(bot) {
  /* -------------------------------
     Hourly Scheduled Updates
     ------------------------------- */
  cron.schedule("0 * * * *", async () => {
    console.log("⏰ Running hourly Chilled Cat stats update...");
    try {
      await postHourlyStats(bot);
    } catch (err) {
      console.error("❌ Cron job failed:", err.message);
    }
  });

  /* -------------------------------
     Manual Trigger (/hourlyupdate)
     ------------------------------- */
  bot.command("hourlyupdate", async (ctx) => {
    try {
      await ctx.reply("📊 Manually triggering Chilled Cat stats update...");
      await postHourlyStats(bot);
      await ctx.reply("✅ Manual update completed. Next update in 1 hour.");
    } catch (err) {
      console.error("❌ /hourlyupdate error:", err.message);
      await ctx.reply("❌ Failed to complete manual update.");
    }
  });

  /* -------------------------------
     Snapshot Viewer (/checkstats)
     ------------------------------- */
  bot.command("checkstats", async (ctx) => {
    try {
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

      const data = typeof raw === "string" ? JSON.parse(raw) : raw;
      const timestamp =
        new Date(data.timestamp).toISOString().replace("T", " ").split(".")[0] +
        " UTC";

      const msg = `
📊 *Last Chilled Cat Snapshot* 🕒

💰 [Price: ${data.priceUsd ?? "—"} USD](https://dexscreener.com/ton/eqaunzdf_szbp6b39_1gcddtatwnfabert8yupoct3wxgbdt)
💦 Liquidity: ${data.liquidityUsd ?? "—"} USD
🐾 [Token Holders: ${data.holdersCount ?? "—"}](https://tonviewer.com/${process.env.TOKEN_CA || "EQAwHA3KhihRIsKKWlJmw7ixrA3FJ4gZv3ialOZBVcl2Olpd"}/holders)
👥 [Telegram Members: ${data.telegramMembers ?? "—"}](https://t.me/ChilledCatCoin)
🐦 [X Followers: ${data.followers ?? "—"}](https://x.com/ChilledCatCoin)

🕒 *Last Updated:* ${timestamp}
`;

      await ctx.replyWithMarkdown(msg);
    } catch (err) {
      console.error("❌ /checkstats error:", err.message);
      await ctx.reply("❌ Failed to load stats data.");
    }
  });

  console.log("✅ Daily Stats feature initialized");
}

module.exports = { setupDailyStats };
