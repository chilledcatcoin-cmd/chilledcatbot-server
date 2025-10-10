const { createCanvas, loadImage } = require("canvas");
const path = require("path");
const fs = require("fs");

/**
 * =====================================================
 * Chilled Cat Stats Card (Dark Mode)
 * =====================================================
 * - Retro-futuristic vaporwave color palette
 * - High contrast for Telegram preview
 * =====================================================
 */

async function generateStatsCard(data) {
  const width = 800;
  const height = 600;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  /* -------------------------------
     🌌 Background gradient
     ------------------------------- */
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#0a0f1f");   // deep space navy
  gradient.addColorStop(0.5, "#1c1b33"); // midnight violet
  gradient.addColorStop(1, "#24243e");   // soft indigo
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // subtle noise / overlay effect (optional aesthetic)
  ctx.globalAlpha = 0.05;
  for (let i = 0; i < 3000; i++) {
    ctx.fillStyle = "white";
    ctx.fillRect(Math.random() * width, Math.random() * height, 1, 1);
  }
  ctx.globalAlpha = 1;

  /* -------------------------------
     🖼️ Load media icons
     ------------------------------- */
  const mediaDir = path.join(__dirname, "media");
  const logos = {
    dex: await loadImage(path.join(mediaDir, "dexscreener_logo_90s.png")),
    ton: await loadImage(path.join(mediaDir, "ton_logo_90s.png")),
    tg: await loadImage(path.join(mediaDir, "telegram_logo_90s.png")),
    x: await loadImage(path.join(mediaDir, "x_logo_90s.png")),
    cat: await loadImage(path.join(mediaDir, "main_logo.jpg")),
  };

  /* -------------------------------
     ✨ Header text
     ------------------------------- */
  ctx.font = "bold 38px 'Comic Sans MS'";
  ctx.fillStyle = "#aaf0ff";
  ctx.shadowColor = "#00ffff";
  ctx.shadowBlur = 18;
  ctx.fillText("😺 Chilled Cat Hourly Stats", 120, 70);
  ctx.shadowBlur = 0;

  /* -------------------------------
     🧾 Stat rows
     ------------------------------- */
  const rows = [
    { img: logos.dex, label: `Price: $${data.priceUsd}`, y: 160, color: "#72e3ff" },
    { img: logos.ton, label: `Holders: ${data.holdersCount}`, y: 240, color: "#7ef7d4" },
    { img: logos.tg, label: `Members: ${data.telegramMembers}`, y: 320, color: "#89a8ff" },
    { img: logos.x, label: `Followers: ${data.followers}`, y: 400, color: "#d597ff" },
  ];

  for (const row of rows) {
    ctx.drawImage(row.img, 70, row.y - 45, 70, 70);
    ctx.font = "bold 26px Arial";
    ctx.fillStyle = row.color;
    ctx.shadowColor = row.color;
    ctx.shadowBlur = 10;
    ctx.fillText(row.label, 180, row.y);
    ctx.shadowBlur = 0;
  }

  /* -------------------------------
     🐾 Chilled Cat logo (bottom corner)
     ------------------------------- */
  ctx.drawImage(logos.cat, 600, 380, 160, 160);

  /* -------------------------------
     🕒 Timestamp
     ------------------------------- */
  ctx.font = "18px 'Courier New'";
  ctx.fillStyle = "#ccc";
  const time = data.timestamp.split(".")[0].replace("T", " ");
  ctx.fillText(`Last Updated: ${time} UTC`, 70, 560);

  /* -------------------------------
     💾 Output
     ------------------------------- */
  const outPath = path.join(mediaDir, "snapshot_dark.png");
  fs.writeFileSync(outPath, canvas.toBuffer("image/png"));
  console.log(`🌑 Dark-mode stats card saved → ${outPath}`);
  return outPath;
}

module.exports = { generateStatsCard };
