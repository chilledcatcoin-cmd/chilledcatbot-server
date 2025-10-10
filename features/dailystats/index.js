const { createCanvas, loadImage } = require("canvas");
const path = require("path");
const fs = require("fs");
const cron = require("node-cron");
const { postHourlyStats } = require("./dailystats");

/**
 * Generates the retro vaporwave stats card
 */
async function generateStatsCard(data) {
  const width = 800;
  const height = 600;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // background gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#3a1c71");
  gradient.addColorStop(0.5, "#d76d77");
  gradient.addColorStop(1, "#ffaf7b");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // load icons
  const mediaDir = path.join(__dirname, "media");
  const icons = {
    dex: await loadImage(path.join(mediaDir, "dexscreener_logo_90s.png")),
    ton: await loadImage(path.join(mediaDir, "ton_logo_90s.png")),
    tg: await loadImage(path.join(mediaDir, "telegram_logo_90s.png")),
    x: await loadImage(path.join(mediaDir, "x_logo_90s.png")),
    cat: await loadImage(path.join(mediaDir, "sticker_9.webp")),
  };

  ctx.font = "bold 32px 'Comic Sans MS'";
  ctx.fillStyle = "#fff";
  ctx.fillText("😺 Chilled Cat Hourly Stats", 140, 60);

  const rows = [
    { img: icons.dex, label: `Price: $${data.priceUsd}`, y: 150 },
    { img: icons.ton, label: `Holders: ${data.holdersCount}`, y: 230 },
    { img: icons.tg, label: `Members: ${data.telegramMembers}`, y: 310 },
    { img: icons.x, label: `Followers: ${data.followers}`, y: 390 },
  ];

  for (const row of rows) {
    ctx.drawImage(row.img, 70, row.y - 35, 80, 80);
    ctx.font = "bold 26px Arial";
    ctx.fillText(row.label, 180, row.y + 5);
  }

  ctx.drawImage(icons.cat, 600, 380, 160, 160);
  ctx.font = "18px 'Courier New'";
  ctx.fillText(`Last Updated: ${data.timestamp.split("T")[0]} ${data.timestamp.split("T")[1].split(".")[0]} UTC`, 80, 550);

  const outPath = path.join(mediaDir, "snapshot.png");
  fs.writeFileSync(outPath, canvas.toBuffer("image/png"));
  console.log(`🖼️ Stats card saved: ${outPath}`);
  return outPath;
}

/**
 * Schedules hourly updates and sets up /checkstats + /hourlyupdate
 */
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

// ✅ Export both functions
module.exports = { setupDailyStats, generateStatsCard };
