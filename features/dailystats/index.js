/**
 * =====================================================
 * Chilled Cat Stats Canvas Generator
 * =====================================================
 * Creates a vaporwave stats card image with 90s logos
 * =====================================================
 */

const { createCanvas, loadImage } = require("canvas");
const path = require("path");
const fs = require("fs");

async function generateStatsCard(data) {
  const width = 800;
  const height = 600;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  /* ---------- Background ---------- */
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#3a1c71");
  gradient.addColorStop(0.5, "#d76d77");
  gradient.addColorStop(1, "#ffaf7b");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  /* ---------- Load images ---------- */
  const assetsDir = path.join(__dirname, "media");
  const dexLogo = await loadImage(path.join(assetsDir, "dexscreener_logo_90s.png"));
  const tonLogo = await loadImage(path.join(assetsDir, "ton_logo_90s.png"));
  const xLogo = await loadImage(path.join(assetsDir, "x_logo_90s.png"));
  const tgLogo = await loadImage(path.join(assetsDir, "telegram_logo_90s.png"));
  const catSticker = await loadImage(path.join(assetsDir, "sticker_9.webp"));

  /* ---------- Title ---------- */
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 36px 'Comic Sans MS'";
  ctx.fillText("😺 Chilled Cat Hourly Stats", 140, 60);

  /* ---------- Stats + icons ---------- */
  const rows = [
    { img: dexLogo, label: `Price: $${data.priceUsd}`, y: 130 },
    { img: tonLogo, label: `Holders: ${data.holdersCount}`, y: 200 },
    { img: tgLogo, label: `Telegram: ${data.telegramMembers}`, y: 270 },
    { img: xLogo, label: `Followers: ${data.followers}`, y: 340 },
  ];

  rows.forEach((row, i) => {
    ctx.drawImage(row.img, 80, row.y - 35, 80, 80);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 28px 'Arial'";
    ctx.fillText(row.label, 180, row.y + 10);
  });

  /* ---------- Mascot ---------- */
  ctx.drawImage(catSticker, 600, 350, 160, 160);

  /* ---------- Footer ---------- */
  ctx.fillStyle = "#ffffff";
  ctx.font = "18px 'Courier New'";
  ctx.fillText(`Last Updated: ${new Date(data.timestamp).toISOString().split(".")[0]} UTC`, 80, 540);

  /* ---------- Save ---------- */
  const outPath = path.join(assetsDir, "snapshot.png");
  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(outPath, buffer);
  console.log(`🖼️ Stats card saved → ${outPath}`);

  return outPath;
}

module.exports = { generateStatsCard };
