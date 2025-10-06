// /modules/Fortune/fortune.js
const fs = require("fs");
const path = require("path");

let fortunes = [];

// Determine absolute path to JSON file
const FORTUNE_PATH = path.join(__dirname, "chilled_cat_fortunes.json");

// Load fortunes at startup
try {
  const data = fs.readFileSync(FORTUNE_PATH, "utf-8");
  fortunes = JSON.parse(data);
  console.log(`✅ Loaded ${fortunes.length} fortunes from chilled_cat_fortunes.json`);
} catch (err) {
  console.error("❌ Could not load chilled_cat_fortunes.json", err);
  fortunes = ["😿 The yarn ball of destiny is tangled. No fortune today."];
}

function setupFortune(bot) {
  bot.command("fortune", (ctx) => {
    const fortune = fortunes[Math.floor(Math.random() * fortunes.length)];
    ctx.reply(`🔮 The Chilled Cat peers into the yarn ball of destiny...\n\n${fortune}`);
  });
}

module.exports = { setupFortune };
