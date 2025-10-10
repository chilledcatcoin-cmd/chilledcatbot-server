const { createCanvas, loadImage } = require("canvas");
const path = require("path");
const fs = require("fs");

async function generateStatsCard(data) {
  const width = 800;
  const height = 600;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  /* ===============================
     🪟 WINDOW FRAME STYLE
     =============================== */

  // Gray background
  ctx.fillStyle = "#c0c0c0";
  ctx.fillRect(0, 0, width, height);

  // Outer border (3D effect)
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, width - 20, height - 20);

  // Inner white inset
  ctx.strokeStyle = "#ffffff";
  ctx.strokeRect(12, 12, width - 24, height - 24);

  // Title bar
  ctx.fillStyle = "#000080";
  ctx.fillRect(12, 12, width - 24, 36);

  // Title text
  ctx.font = "bold 18px 'Arial'";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("😺 Chilled Cat Stats — Windows RC Edition", 28, 36);

  // Control buttons (minimize, maximize, close)
  const btnX = width - 24 - 60;
  const btnY = 18;
  const btnW = 16;
  const spacing = 22;
  ctx.fillStyle = "#c0c0c0";
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(btnX + i * spacing, btnY, btnW, btnW);
    ctx.strokeStyle = "#000000";
    ctx.strokeRect(btnX + i * spacing, btnY, btnW, btnW);
  }
  ctx.fillStyle = "#000000";
  ctx.fillText("_", btnX + 4, btnY + 14); // minimize
  ctx.fillRect(btnX + spacing + 4, btnY + 6, 8, 8); // maximize
  ctx.beginPath(); // close
  ctx.moveTo(btnX + spacing * 2 + 4, btnY + 4);
  ctx.lineTo(btnX + spacing * 2 + 12, btnY + 12);
  ctx.moveTo(btnX + spacing * 2 + 12, btnY + 4);
  ctx.lineTo(btnX + spacing * 2 + 4, btnY + 12);
  ctx.stroke();

  /* ===============================
     🧩 MAIN CONTENT
     =============================== */

  const mediaDir = path.join(__dirname, "media");
  const logos = {
    dex: await loadImage(path.join(mediaDir, "dexscreener_logo_90s.png")),
    ton: await loadImage(path.join(mediaDir, "ton_logo_90s.png")),
    tg: await loadImage(path.join(mediaDir, "telegram_logo_90s.png")),
    x: await loadImage(path.join(mediaDir, "x_logo_90s.png")),
    cat: await loadImage(path.join(mediaDir, "main_logo.jpg")),
  };

  // Content panel background
  ctx.fillStyle = "#dfdfdf";
  ctx.fillRect(40, 70, width - 80, height - 140);
  ctx.strokeStyle = "#808080";
  ctx.strokeRect(40, 70, width - 80, height - 140);

  // Content title
  ctx.font = "bold 20px 'Tahoma'";
  ctx.fillStyle = "#000";
  ctx.fillText("Chilled Cat Hourly Snapshot", 60, 105);

  // Stat rows
  const rows = [
    { img: logos.dex, label: `Price: $${data.priceUsd}`, y: 160 },
    { img: logos.ton, label: `Holders: ${data.holdersCount}`, y: 230 },
    { img: logos.tg, label: `Members: ${data.telegramMembers}`, y: 300 },
    { img: logos.x, label: `Followers: ${data.followers}`, y: 370 },
  ];

  for (const row of rows) {
    ctx.drawImage(row.img, 80, row.y - 30, 64, 64);
    ctx.font = "16px 'Tahoma'";
    ctx.fillText(row.label, 160, row.y + 10);
  }

  // Cat logo in corner
  ctx.drawImage(logos.cat, width - 220, height - 200, 180, 180);

  // Bottom bar
  ctx.fillStyle = "#000080";
  ctx.fillRect(12, height - 36, width - 24, 24);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 14px 'Courier New'";
  ctx.fillText(
    `Updated: ${data.timestamp.split(".")[0].replace("T", " ")} UTC`,
    24,
    height - 18
  );

  // 💾 Save
  const outPath = path.join(mediaDir, "snapshot_winrc.png");
  fs.writeFileSync(outPath, canvas.toBuffer("image/png"));
  console.log(`🖼️ Windows RC stats card saved → ${outPath}`);
  return outPath;
}

module.exports = { generateStatsCard };
