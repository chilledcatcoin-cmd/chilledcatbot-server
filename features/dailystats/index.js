/**
 * =====================================================
 * Chilled Cat Stats Controller (Dynamic Scheduler)
 * =====================================================
 * - Automatically fetches and posts hourly stats
 * - /hourlyupdate forces a pull immediately
 * - /checkstats shows last saved data
 * - Next update always 1 hour after last successful pull
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

let scheduledTask = null;

/* -------------------- Redis Snapshot Loader -------------------- */
async function getLastStats() {
  try {
    const raw = await redis.get("chilledcat:stats");
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error("❌ Failed to load stats from Redis:", err.message);
    return null;
  }
}

/* -------------------- Dynamic Scheduler -------------------- */
function scheduleNextRun(bot, delayMs = 60 * 60 * 1000) {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }

  const nextTime = new Date(Date.now() + delayMs);
  const minutes = nextTime.getMinutes();
  const hours = nextTime.getHours();

  // cron-style schedule expression for one-time future run
  const cronExpr = `${minutes} ${hours} * * *`;

  scheduledTask = cron.schedule(cronExpr, async () => {
    console.log("⏰ Triggering next scheduled Chilled Cat stats update...");
    await postHourlyStats(bot);
    scheduleNextRun(bot); // reschedule again 1 hour later
  });

  console.log(`🕒 Next scheduled update: ${nextTime.toISOString().replace("T", " ").split(".")[0]} UTC`);
}

/* -------------------- Main Init -------------------- */
function initHourlyStats(bot) {
  console.log("🚀 Initializing Chilled Cat Stats system...");

  // Manual trigger command
  bot.command("hourlyupdate", async (ctx) => {
    await ctx.reply("📊 Manually triggering Chilled Cat stats update...");
    await postHourlyStats(bot);
    await ctx.reply("✅ Manual update completed. Next update in 1 hour.");
    scheduleNextRun(bot);
  });

  // Check saved stats (if no data, trigger first pull)
  bot.command("checkstats", async (ctx) => {
    const data = await getLastStats();

    if (!data) {
      await ctx.reply("⚠️ No data yet — fetching first stats snapshot...");
      await postHourlyStats(bot);
      await ctx.reply("✅ Initial stats snapshot pulled! Next update in 1 hour.");
      scheduleNextRun(bot);
      return;
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

  // At startup, if data exists, use timestamp to schedule next update
  (async () => {
    const last = await getLastStats();
    if (last && last.timestamp) {
      const lastTime = new Date(last.timestamp).getTime();
      const diff = Date.now() - lastTime;
      const remaining = 60 * 60 * 1000 - diff;
      const nextDelay = Math.max(remaining, 10000); // at least 10s buffer
      console.log(`🕓 Resuming schedule; next update in ${(nextDelay / 60000).toFixed(1)} min`);
      scheduleNextRun(bot, nextDelay);
    } else {
      console.log("🕓 No existing stats — waiting for manual trigger (/checkstats or /hourlyupdate).");
    }
  })();
}

module.exports = { initHourlyStats };
