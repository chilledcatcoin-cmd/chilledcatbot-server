/**
 * =====================================================
 * ChilledCatBot — index.js
 * Clean base using webhook only (Render compatible)
 * =====================================================
 */

require("dotenv").config();
const express = require("express");
const { bot } = require("./bot");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const BOT_TOKEN = process.env.BOT_TOKEN;

(async () => {
  try {
    if (!WEBHOOK_URL) throw new Error("❌ Missing WEBHOOK_URL");

    const webhookPath = `/bot${BOT_TOKEN}`;
    const webhookEndpoint = `${WEBHOOK_URL}${webhookPath}`;

    console.log("🌐 Setting Telegram webhook to:", webhookEndpoint);
    await bot.telegram.setWebhook(webhookEndpoint);

    // Bind Telegram webhook to Express
    app.use(bot.webhookCallback(webhookPath));
    app.get("/", (req, res) => res.send("✅ ChilledCatBot webhook running fine."));

    app.listen(PORT, () => console.log(`🚀 Webhook server active on port ${PORT}`));
  } catch (err) {
    console.error("❌ Failed to start webhook:", err);
  }
})();

// Graceful shutdown
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
