/**
 * =====================================================
 * Chilled Cat Stats Controller
 * =====================================================
 *  - Initializes hourly cron schedule
 *  - Registers /hourlyupdate (manual trigger)
 *  - Registers /checkstats (show last saved snapshot)
 * =====================================================
 */

const cron = require("node-cron");
const Redis = require("ioredis");
const { postHourlyStats } = require("./dailystats");

const redis = new Redis(process.env.REDIS_URL, {
  tls: {},
  enableOfflineQueue: true,
  maxRetriesPerRequest: null,
  retryStrategy: (times) => Math.min(times * 200, 5000),
});

/* -------------------- Helper to load last saved stats -------------------- */
async function getLastStats() {
  try {
    const raw = await redis.get("chilledcat:stats");
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error("❌ Failed to load stats from Redis:", err.message);
    return null;
  }
}

/* -------------------- Main Initialization -------------------- */
function initHourlyStats(bot) {
  // ⏰ Run every hour
  cron.schedule("0 * * * *", () => postHourlyStats(bot));
  console.log("📅 Hourly Chilled Cat stats scheduled (every top of hour)");

  // 📊 Manual update command
  bot.command("hourlyupdate", async (ctx) => {
    await ctx.reply("📊 Posting latest Chilled Cat stats...");
    await postHourlyStats(bot);
    await ctx.reply("✅ Stats posted!");
  });

  // 🔎 Check last saved stats (from Redis)
  bot.command("checkstats", async (ctx) => {
    const data = await getLastStats();
    if (!data) {
      return ctx.reply("⚠️ No stats found in Redis yet. Wait for the next hourly update.");
    }

    const ts = new Date(data.timestamp).toISOString().replace("T", " ").split(".")[0] + " UTC";
    const msg = `
🐾 *Last Stored Chilled Cat Stats* 🐾

💰 Price: ${data.priceUsd} USD
📉 24h Change: ${data.priceChange24h} %
📊 Volume: ${data.volume24hUsd} USD
💦 Liquidity: ${data.liquidityUsd} USD
💎 Treasury: ${data.balanceTon} TON
🧾 Recent TXs: ${data.txCount}
👥 Telegram Members: ${data.telegramMembers}
🐦 X Followers: ${data.followers}

🕒 Saved: ${ts}
`;
    await ctx.replyWithMarkdown(msg);
  });
}

module.exports = { initHourlyStats };
