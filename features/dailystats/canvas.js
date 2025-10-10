const { createCanvas, loadImage } = require("canvas");
const path = require("path");
const fs = require("fs");

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

  const mediaDir = path.join(__dirname, "media");
  const logos = {
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
    { img: logos.dex, label: `Price: $${data.priceUsd}`, y: 150 },
    { img: logos.ton, label: `Holders: ${data.holdersCount}`, y: 230 },
    { img: logos.tg, label: `Members: ${data.telegramMembers}`, y: 310 },
    { img: logos.x, label: `Followers: ${data.followers}`, y: 390 },
  ];

  for (const row of rows) {
    ctx.drawImage(row.img, 70, row.y - 35, 80, 80);
    ctx.font = "bold 26px Arial";
    ctx.fillText(row.label, 180, row.y + 5);
  }

  ctx.drawImage(logos.cat, 600, 380, 160, 160);
  ctx.font = "18px 'Courier New'";
  ctx.fillText(`Last Updated: ${data.timestamp.split(".")[0].replace("T", " ")} UTC`, 80, 550);

  const outPath = path.join(mediaDir, "snapshot.png");
  fs.writeFileSync(outPath, canvas.toBuffer("image/png"));
  console.log(`🖼️ Stats card saved → ${outPath}`);
  return outPath;
}

module.exports = { generateStatsCard };
