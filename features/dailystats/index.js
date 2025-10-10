/**
 * =====================================================
 * Chilled Cat Daily Stats Scheduler + Commands
 * =====================================================
 * Handles:
 *  - Hourly cron updates
 *  - /hourlyupdate manual trigger
 *  - /checkstats with retro image output + clickable links
 * =====================================================
 */

const cron = require("node-cron");
const { postHourlyStats } = require("./dailystats");
const { Redis } = require("@upstash/redis");
const { createCanvas, loadImage } = require("canvas");

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
        await ctx.reply("⚠️ No data yet — fetching first snapshot...");
        await postHourlyStats(bot);
        return ctx.reply("✅ Initial stats snapshot pulled! Next update in 1 hour.");
      }

      const data = typeof raw === "string" ? JSON.parse(raw) : raw;

      /* -------------------------------
         🎨 Render Chilled Cat Stats Card
         ------------------------------- */
      const width = 800;
      const height = 550;
      const canvas = createCanvas(width, height);
      const c = canvas.getContext("2d");

      // Background
      c.fillStyle = "#c0c0c0"; // classic Win95 gray
      c.fillRect(0, 0, width, height);

      // Title bar
      c.fillStyle = "#000080"; // blue bar
      c.fillRect(0, 0, width, 40);
      c.fillStyle = "#ffffff";
      c.font = "bold 20px 'MS Sans Serif'";
      c.fillText("🐾 Chilled Cat — Stats.EXE", 15, 27);

      // Inner window
      c.fillStyle = "#ffffff";
      c.fillRect(10, 50, width - 20, height - 60);

      // Text content
      c.fillStyle = "#000";
      c.font = "18px 'Courier New'";

      const lines = [
        "CHILLED CAT SNAPSHOT 🪶",
        "──────────────────────────────",
        `💰 Price: $${data.priceUsd ?? "—"}`,
        `💦 Liquidity: $${data.liquidityUsd ?? "—"}`,
        `🐾 Holders: ${data.holdersCount ?? "—"}`,
        `👥 Members: ${data.telegramMembers ?? "—"}`,
        `🐦 Followers: ${data.followers ?? "—"}`,
        `💎 Treasury: ${data.balanceTon ?? "—"} TON`,
        "",
        `Last Updated: ${(data.timestamp || "").replace("T", " ").split(".")[0]} UTC`,
      ];

      lines.forEach((line, i) => {
        c.fillText(line, 30, 100 + i * 30);
      });

      // Footer
      c.fillStyle = "#808080";
      c.font = "16px 'MS Sans Serif'";
      c.fillText("ChilledCatCoin.com", 30, height - 25);
      c.fillText("🐾 Powered by ChilledCatBot", width - 280, height - 25);

      // Optionally draw logo (if you have a hosted PNG)
      try {
        const logo = await loadImage("https://chilledcatcoin.com/assets/logo.png");
        c.drawImage(logo, width - 60, 5, 32, 32);
      } catch {
        // silently skip if logo not found
      }

      const buffer = canvas.toBuffer("image/png");

      /* -------------------------------
         🪶 Caption with Clickable Links
         ------------------------------- */
      const caption = `
💰 [Dexscreener](https://dexscreener.com/ton/eqaunzdf_szbp6b39_1gcddtatwnfabert8yupoct3wxgbdt)
🐾 [Holders](https://tonviewer.com/${process.env.TOKEN_CA || "EQAwHA3KhihRIsKKWlJmw7ixrA3FJ4gZv3ialOZBVcl2Olpd"}/holders)
👥 [Telegram](https://t.me/ChilledCatCoin)
🐦 [X / Twitter](https://x.com/ChilledCatCoin)
`;

      await ctx.replyWithPhoto({ source: buffer }, {
        caption: caption.trim(),
        parse_mode: "Markdown"
      });

    } catch (err) {
      console.error("❌ /checkstats error:", err.message);
      await ctx.reply("❌ Failed to load or render stats data.");
    }
  });

  console.log("✅ Daily Stats feature initialized");
}

module.exports = { setupDailyStats };
