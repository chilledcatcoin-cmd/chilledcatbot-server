// fortune.js
const fs = require("fs");
let fortunes = [];

// Load fortunes at startup
try {
  const data = fs.readFileSync("./chilled_cat_fortunes.json", "utf-8");
  fortunes = JSON.parse(data);
  console.log(`✅ Loaded ${fortunes.length} fortunes.`);
} catch (err) {
  console.error("❌ Could not load chilled_cat_fortunes.json", err);
  fortunes = ["😿 The yarn ball of destiny is tangled. No fortune today."];
}

module.exports = {
  setupFortune
};

function setupFortune(bot) {
  bot.command("fortune", (ctx) => {
    const fortune = fortunes[Math.floor(Math.random() * fortunes.length)];
    ctx.reply(`🔮 The Chilled Cat peers into the yarn ball of destiny...\n\n${fortune}`);
  });
}
