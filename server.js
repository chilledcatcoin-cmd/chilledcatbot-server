const express = require("express");
const axios = require("axios");
const cors = require("cors");
const { Telegraf } = require("telegraf");
require("dotenv").config();

const { BOT_TOKEN, PORT = 3000 } = process.env;

if (!BOT_TOKEN) {
  console.error("❌ Missing BOT_TOKEN in .env");
  process.exit(1);
}

const app = express();
app.use(express.json());
app.use(cors());

// 🎮 Map your games here
const GAMES = {
  flappycat: "https://chilledcatcoin-cmd.github.io/chilledcatbot/games/flappycat/chilled_flappy_cat_2013_tgv1.html",
  catsweeper: "https://chilledcatcoin-cmd.github.io/chilledcatbot/games/catsweeper/index.html"
};

// 🤖 Setup Telegraf bot
const bot = new Telegraf(BOT_TOKEN);

// Commands to start games
bot.command("flappycat", (ctx) => ctx.replyWithGame("flappycat"));
bot.command("catsweeper", (ctx) => ctx.replyWithGame("catsweeper"));

// Inline query handler (for @chilledcatbot in any chat)
bot.on("inline_query", async (ctx) => {
  const results = [
    { type: "game", id: "1", game_short_name: "flappycat" },
    { type: "game", id: "2", game_short_name: "catsweeper" }
  ];
  return ctx.answerInlineQuery(results);
});

// Handle callback queries (when "Play" is tapped)
/ Handle callback queries (when "Play" is tapped)
bot.on("callback_query", async (ctx) => {
  try {
    const q = ctx.update.callback_query;
    const shortName = q.game_short_name;

    if (!GAMES[shortName]) {
      return ctx.answerCbQuery("Unknown game");
    }

    const url = new URL(GAMES[shortName]);
    url.searchParams.set("uid", q.from.id);
    url.searchParams.set("chat_id", q.message.chat.id);
    url.searchParams.set("message_id", q.message.message_id);

    // 👇 Add cache buster so Telegram always reloads fresh
    url.searchParams.set("_ts", Date.now());

    return ctx.telegram.answerGameQuery(q.id, url.toString());
  } catch (e) {
    console.error("Callback error:", e.message);
  }
});

// Score endpoint (shared by all games)
app.post("/score", async (req, res) => {
  try {
    const { uid, chat_id, message_id, score } = req.body;
    if (!uid || !chat_id || !message_id || typeof score !== "number") {
      return res.status(400).send("bad payload");
    }

    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/setGameScore`, {
      user_id: Number(uid),
      score: Number(score),
      chat_id: Number(chat_id),
      message_id: Number(message_id),
      edit_message: true
    });

    res.sendStatus(200);
  } catch (err) {
    console.error("setGameScore failed:", err.response?.data || err.message);
    res.status(500).send("failed");
  }
});

// Optional: get highscores
bot.command("highscores", async (ctx) => {
  const reply = ctx.message?.reply_to_message;
  if (!reply || !reply.game) {
    return ctx.reply("Reply to a game message with /highscores");
  }
  try {
    const resp = await axios.post(
      `https://api.telegram.org/bot${BOT_TOKEN}/getGameHighScores`,
      {
        user_id: ctx.from.id,
        chat_id: ctx.chat.id,
        message_id: reply.message_id
      }
    );
    const list = resp.data?.result || [];
    if (!list.length) return ctx.reply("No scores yet.");

    const lines = list
      .slice(0, 10)
      .map((p, i) => `${i + 1}. ${p.user.first_name || "Player"} — ${p.score}`)
      .join("\n");

    ctx.reply(`🏆 High Scores\n${lines}`);
  } catch (e) {
    console.error("highscores error:", e.response?.data || e.message);
    ctx.reply("Could not fetch highscores.");
  }
});

// Launch bot + server
bot.launch();
app.get("/health", (_, res) => res.send("ok"));
app.listen(PORT, () =>
  console.log(`🚀 chilledcatbot server running on http://localhost:${PORT}`)
);
