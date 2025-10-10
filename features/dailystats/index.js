const cron = require("node-cron");
const { postHourlyStats } = require("./dailystats");
const { Redis } = require("@upstash/redis");

function setupDailyStats(bot) {
  cron.schedule("0 * * * *", async () => {
    console.log("⏰ Running hourly Chilled Cat stats update...");
    await postHourlyStats(bot);
  });

  bot.command("hourlyupdate", async (ctx) => {
    await ctx.reply("📊 Manually triggering Chilled Cat stats update...");
    await postHourlyStats(bot);
    await ctx.reply("✅ Manual update completed. Next update in 1 hour.");
  });

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
      const timestamp = new Date(data.timestamp)
        .toISOString()
        .replace("T", " ")
        .split(".")[0] + " UTC";

      const msg = `
📊 *Last Chilled Cat Snapshot* 🕒

💰 [Price: ${data.priceUsd ?? "—"} USD](https://dexscreener.com/ton/eqaunzdf_szbp6b39_1gcddtatwnfabert8yupoct3wxgbdt)
💦 Liquidity: ${data.liquidityUsd ?? "—"} USD
👥 [Telegram Members: ${data.telegramMembers ?? "—"}](https://t.me/ChilledCatCoin)
🐾 [Token Holders: ${data.holdersCount ?? "—"}](https://tonviewer.com/EQAwHA3KhihRIsKKWlJmw7ixrA3FJ4gZv3ialOZBVcl2Olpd/holders)
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
