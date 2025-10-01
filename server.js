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
bot.start((ctx) =>
  ctx.reply("😺 Welcome! Play /flappycat or /catsweeper")
);

bot.command("flappycat", (ctx) => ctx.replyWithGame("flappycat"));
bot.command("catsweeper", (ctx) => ctx.replyWithGame("catsweeper"));

/* -------------------------------
   Callback handler (Play button)
   ------------------------------- */
bot.on("callback_query", async (ctx) => {
  try {
    const q = ctx.update.callback_query;
    const shortName = q.game_short_name;

    if (!GAMES[shortName]) {
      return ctx.answerCbQuery("Unknown game!");
    }

    const url = new URL(GAMES[shortName]);
    url.searchParams.set("uid", q.from.id);
    url.searchParams.set("chat_id", q.message.chat.id);
    url.searchParams.set("message_id", q.message.message_id);

    // 🆕 Pass Telegram user info for PlayFab display names
    url.searchParams.set("username", q.from.username || "");
    url.searchParams.set("first_name", q.from.first_name || "");

    // cache buster
    url.searchParams.set("_ts", Date.now());

    return ctx.telegram.answerGameQuery(q.id, url.toString());
  } catch (e) {
    console.error("callback_query error:", e.message);
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
