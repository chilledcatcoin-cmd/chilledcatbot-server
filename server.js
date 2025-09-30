require("dotenv").config();
const express = require("express");
const { Telegraf } = require("telegraf");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) throw new Error("❌ BOT_TOKEN missing in environment variables");

const bot = new Telegraf(BOT_TOKEN);

/* -------------------------------
   Game registry
   ------------------------------- */
const GAMES = {
  flappycat: "https://chilledcatcoin-cmd.github.io/chilledcatbot/games/flappycat/chilled_flappy_cat_2013_tgv1.html",
  catsweeper: "https://chilledcatcoin-cmd.github.io/chilledcatbot/games/catsweeper/catsweeper.html"
};

/* -------------------------------
   Bot commands
   ------------------------------- */
// /start with inline menu
bot.start((ctx) => {
  ctx.reply(
    "😺 Welcome to Chilled Cat Bot!\n\n" +
    "🎮 Choose a game to play:",
    {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "▶️ Flappy Cat", callback_game: {}, callback_data: "flappycat" },
            { text: "▶️ CatSweeper", callback_game: {}, callback_data: "catsweeper" }
          ]
        ]
      }
    }
  );
});

// /help
bot.command("help", (ctx) => {
  ctx.reply(
    "🐾 Available commands:\n\n" +
    "/start - Welcome menu\n" +
    "/flappycat - Play Flappy Cat\n" +
    "/catsweeper - Play CatSweeper\n" +
    "/highscores - Show high scores (reply to a game message)"
  );
});

// text commands (still work alongside buttons)
bot.command("flappycat", (ctx) => ctx.replyWithGame("flappycat"));
bot.command("catsweeper", (ctx) => ctx.replyWithGame("catsweeper"));

bot.command("highscores", async (ctx) => {
  if (!ctx.message.reply_to_message) {
    return ctx.reply("Reply to a game message with /highscores");
  }
  try {
    const resp = await axios.post(
      `https://api.telegram.org/bot${BOT_TOKEN}/getGameHighScores`,
      {
        user_id: ctx.from.id,
        chat_id: ctx.message.reply_to_message.chat.id,
        message_id: ctx.message.reply_to_message.message_id,
      }
    );
    if (resp.data.ok) {
      const scores = resp.data.result;
      if (!scores.length) return ctx.reply("No scores yet 😺");
      const lines = scores
        .slice(0, 10)
        .map((s, i) => `${i + 1}. ${s.user.first_name}: ${s.score}`);
      ctx.reply("🏆 High Scores:\n" + lines.join("\n"));
    } else {
      ctx.reply("Error loading scores.");
    }
  } catch (e) {
    console.error("highscores error:", e.response?.data || e.message);
    ctx.reply("Failed to fetch highscores.");
  }
});

/* -------------------------------
   Callback handler (Play button)
   ------------------------------- */
bot.on("callback_query", async (ctx) => {
  try {
    const q = ctx.update.callback_query;
    const shortName = q.game_short_name || q.data;

    if (!GAMES[shortName]) {
      return ctx.answerCbQuery("Unknown game!");
    }

    const url = new URL(GAMES[shortName]);
    url.searchParams.set("uid", q.from.id);
    url.searchParams.set("chat_id", q.message.chat.id);
    url.searchParams.set("message_id", q.message.message_id);
    url.searchParams.set("_ts", Date.now()); // cache-buster

    return ctx.telegram.answerGameQuery(q.id, url.toString());
  } catch (e) {
    console.error("callback_query error:", e.message);
  }
});

/* -------------------------------
   HTTP endpoints for games
   ------------------------------- */
app.post("/score", async (req, res) => {
  try {
    const { uid, chat_id, message_id, score } = req.body;
    if (!uid || !chat_id || !message_id || typeof score !== "number") {
      return res.status(400).send("bad payload");
    }

    const resp = await axios.post(
      `https://api.telegram.org/bot${BOT_TOKEN}/setGameScore`,
      {
        user_id: Number(uid),
        score: Number(score),
        chat_id: Number(chat_id),
        message_id: Number(message_id),
        force: true,
      }
    );
    res.json(resp.data);
  } catch (e) {
    console.error("score error:", e.response?.data || e.message);
    res.status(500).json({ ok: false, error: "failed" });
  }
});

app.post("/highscores", async (req, res) => {
  try {
    const { uid, chat_id, message_id } = req.body;
    if (!uid || !chat_id || !message_id) {
      return res.status(400).send("bad payload");
    }

    const resp = await axios.post(
      `https://api.telegram.org/bot${BOT_TOKEN}/getGameHighScores`,
      {
        user_id: Number(uid),
        chat_id: Number(chat_id),
        message_id: Number(message_id),
      }
    );
    res.json(resp.data);
  } catch (e) {
    console.error("highscores http error:", e.response?.data || e.message);
    res.status(500).json({ ok: false, error: "failed" });
  }
});

/* -------------------------------
   Launch bot & server
   ------------------------------- */
bot.launch();
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
