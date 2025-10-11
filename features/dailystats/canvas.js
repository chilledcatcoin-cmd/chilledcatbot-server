const { createCanvas, loadImage } = require("canvas");
const path = require("path");
const fs = require("fs");

async function generateStatsCard(data) {
  const width = 800;
  const height = 600;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  /* 🌌 Background gradient */
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#0a0f1f");
  gradient.addColorStop(0.5, "#1c1b33");
  gradient.addColorStop(1, "#24243e");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Starry noise
  ctx.globalAlpha = 0.05;
  for (let i = 0; i < 3000; i++) {
    ctx.fillStyle = "white";
    ctx.fillRect(Math.random() * width, Math.random() * height, 1, 1);
  }
  ctx.globalAlpha = 1;

  /* 🖼️ Load logos */
  const mediaDir = path.join(__dirname, "media");
  const logos = {
    dex: await loadImage(path.join(mediaDir, "dexscreener_logo_90s.png")),
    ton: await loadImage(path.join(mediaDir, "ton_logo_90s.png")),
    tg: await loadImage(path.join(mediaDir, "telegram_logo_90s.png")),
    x: await loadImage(path.join(mediaDir, "x_logo_90s.png")),
    cat: await loadImage(path.join(mediaDir, "main_logo.jpg")),
  };

  /* ✨ Header */
  ctx.font = "bold 38px 'Comic Sans MS'";
  ctx.fillStyle = "#aaf0ff";
  ctx.shadowColor = "#00ffff";
  ctx.shadowBlur = 18;
  ctx.fillText("😺 Chilled Cat Daily Stats", 60, 70); // moved left
  ctx.shadowBlur = 0;

  /* 🧾 Stats */
  const formatNum = (n, d = 2) =>
    typeof n === "number" ? n.toLocaleString(undefined, { maximumFractionDigits: d }) : n;

  const followerDelta =
    typeof data.followersDelta === "number" && data.followersDelta !== 0
      ? data.followersDelta > 0
        ? ` (+${data.followersDelta}⬆️)`
        : ` (${data.followersDelta}⬇️)`
      : "";

  const rows = [
    {
      img: logos.dex,
      label: `Marketcap: $${formatNum(data.marketcap || 0)} (% change)`,
      y: 140,
      color: "#9ee8ff",
    },
    {
      img: logos.dex,
      label: `Price: $${formatNum(data.priceUsd, 6)} (${formatNum(data.priceChange24h, 2)}%)`,
      y: 190,
      color: "#72e3ff",
    },
    {
      img: logos.ton,
      label: `Holders: ${formatNum(data.holdersCount)}  |  Liquidity: $${formatNum(
        data.liquidityUsd,
        0
      )}`,
      y: 270,
      color: "#7ef7d4",
    },
    {
      img: logos.tg,
      label: `Telegram Members: ${formatNum(data.telegramMembers)}`,
      y: 350,
      color: "#89a8ff",
    },
    {
      img: logos.x,
      label: `X Followers: ${formatNum(data.followers)}${followerDelta}`,
      y: 430,
      color: "#d597ff",
    },
  ];

  for (const row of rows) {
    ctx.drawImage(row.img, 50, row.y - 45, 60, 60);
    ctx.font = "bold 24px Arial";
    ctx.fillStyle = row.color;
    ctx.shadowColor = row.color;
    ctx.shadowBlur = 10;
    ctx.fillText(row.label, 130, row.y);
    ctx.shadowBlur = 0;
  }

  /* 🐾 Cat Logo (moved up slightly) */
  ctx.drawImage(logos.cat, 610, 320, 160, 160);

  /* 🕒 Timestamps */
  const time = (data.timestamp || new Date().toISOString()).split(".")[0].replace("T", " ");
  const nextTime = data.nextUpdate
    ? data.nextUpdate.split(".")[0].replace("T", " ")
    : "Soon...";

  ctx.font = "18px 'Courier New'";
  ctx.fillStyle = "#ccc";
  ctx.fillText(`Next Update: ${nextTime} UTC`, 50, 530);
  ctx.fillText(`Last Updated: ${time} UTC`, 50, 560);

  /* 💾 Save output safely */
  let outDir;
  if (process.env.RENDER || process.env.K_SERVICE || process.env.FLY_APP_NAME) {
    outDir = "/tmp";
  } else {
    outDir = path.join(__dirname, "media");
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  }

  const outPath = path.join(outDir, "snapshot_dark.png");

  try {
    fs.writeFileSync(outPath, canvas.toBuffer("image/png"));
    console.log(`🌑 Dark-mode stats card saved → ${outPath}`);
  } catch (err) {
    console.error("❌ Failed to save canvas image:", err.message);
  }

  return outPath;
}

module.exports = { generateStatsCard };
