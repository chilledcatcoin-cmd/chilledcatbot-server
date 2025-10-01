/**
 *
 *    _______   .---.  .---..-./`)   .---.     .---.       .-''-.   ______     
 *   /   __  \  |   |  |_ _|\ .-.')  | ,_|     | ,_|     .'_ _   \ |    _ `''. 
 *  | ,_/  \__) |   |  ( ' )/ `-' \,-./  )   ,-./  )    / ( ` )   '| _ | ) _  \
 *,-./  )       |   '-(_{;}_)`-'`"`\  '_ '`) \  '_ '`) . (_ o _)  ||( ''_'  ) |
 *\  '_ '`)     |      (_,_) .---.  > (_)  )  > (_)  ) |  (_,_)___|| . (_) `. |
 * > (_)  )  __ | _ _--.   | |   | (  .  .-' (  .  .-' '  \   .---.|(_    ._) '
 *(  .  .-'_/  )|( ' ) |   | |   |  `-'`-'|___`-'`-'|___\  `-'    /|  (_.\.' / 
 * `-'`-'     / (_{;}_)|   | |   |   |        \|        \\       / |       .'  
 *   `._____.'  '(_,_) '---' '---'   `--------``--------` `'-..-'  '-----'`    
 *                                                                           
 *                   +=*          ***	    _______      ____   ,---------. 			              
 *                  *:::*        *=.:*	   /   __  \   .'  __ `.\          \	             
 *                 *.::::+      *:.:::*     | ,_/  \__) /   '  \  \`--.  ,---'         
 *                 +....+*++**++::::::=*  ,-./  )       |___|  /  |   |   \       
 *               *+++=:.:::::.:..:.::::*  \  '_ '`)        _.-`   |   :_ _:            
 *                ++++=--=+=-+:=+++++++=+  > (_)  )  __ .'   _    |   (_I_)        
 *               *:+..##.:++::+++***=++*  (  .  .-'_/  )|  _( )_  |  (_(=)_)   
 *               *..*....-+:::++..#:..=+   `-'`-'     / \ (_ o _) /   (_I_)   
 *               *........+::.+.:++*+..*     `._____.'   '.(_,_).'    '---'
 *               *...*+:.:::::-....:...+           
 *               *....*....:=.....::...**:**=*     
 *               *.....+=...+...-:....-*::+=:+*-*  
 *                +....+**+**+****.:=+*+.=*:=*.:*  
 *              **+....=-:####%:+...*.+::::.*=:*   
 *           *:..=*++=..:+=:::=*....*...*::..:*    
 *         *+.:+......:+.......:+*-:=+.......*     
 *         *.=-........:=............:+:...:**     [ chilled cat warez ]       /\_/\         
 *        *:-=...=...*.++.............*::::*.*     nfo: vibes • meow • zzz    ( o.o )        
 *        *.*....*::.**:.............*-.:::+.*     rel: 1997 // TON forever    > ^ <         
 *        *:=....=**+:...........::..*.....+:*     
 *        **.....+*::=+::.::.....:*:**..:..+:*     
 *        **.....+:-+*:.:+::::**:-=::+.....+:*     
 *
 * =====================================================
 * Chilled Cat Bot
 * Version: 1.3.0
 * Date: 2025-10-01
 *
 * Changelog:
 * v1.3.0 - Added /menu with inline keyboards, cleaned up leaderboard output
 * v1.2.0 - Added group/global leaderboard support with caching
 * v1.1.0 - Integrated PlayFab leaderboards
 * v1.0.0 - Basic game launch (Flappy Cat, CatSweeper)
 * =====================================================
 */


require("dotenv").config();
const express = require("express");
const { Telegraf } = require("telegraf");
const axios = require("axios");

const app = express();
app.use(express.json());

const BOT_TOKEN = process.env.BOT_TOKEN;
const PLAYFAB_TITLE_ID = process.env.PLAYFAB_TITLE_ID;
const PLAYFAB_DEV_SECRET = process.env.PLAYFAB_DEV_SECRET;
if (!BOT_TOKEN || !PLAYFAB_TITLE_ID || !PLAYFAB_DEV_SECRET) {
  throw new Error("❌ Missing env vars");
}

const bot = new Telegraf(BOT_TOKEN);

/* -------------------------------
   Game short_names (must match BotFather)
   ------------------------------- */
const GAMES = {
  flappycat: "https://chilledcatcoin-cmd.github.io/chilledcatbot/games/flappycat/flappycat.html",
  catsweeper: "https://chilledcatcoin-cmd.github.io/chilledcatbot/games/catsweeper/catsweeper.html"
};

/* -------------------------------
   Simple cache (per-stat, 30s)
   ------------------------------- */
const cache = new Map();

async function getLeaderboardCached(statName) {
  const cached = cache.get(statName);
  if (cached && (Date.now() - cached.ts < 30000)) {
    return cached.data;
  }

  const resp = await axios.post(
    `https://${PLAYFAB_TITLE_ID}.playfabapi.com/Server/GetLeaderboard`,
    {
      StatisticName: statName,
      StartPosition: 0,
      MaxResultsCount: 10,
    },
    { headers: { "X-SecretKey": PLAYFAB_DEV_SECRET } }
  );

  const list = resp.data.data.Leaderboard;
  cache.set(statName, { ts: Date.now(), data: list });
  return list;
}

/* -------------------------------
   Bot commands
   ------------------------------- */
bot.start((ctx) => {
  ctx.reply("😺 Welcome to *Chilled Cat Games!*\n\nCommands:\n" +
            "🎮 /flappycat — Play Flappy Cat\n" +
            "💣 /catsweeper — Play CatSweeper\n" +
            "🏆 /leaderboard <game> [global|group]", 
            { parse_mode: "Markdown" });
});

bot.command("menu", (ctx) => {
  ctx.reply("📋 Main Menu", {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🏆 FlappyCat Global", callback_data: "lb_flappycat_global" },
          { text: "🏆 FlappyCat Group", callback_data: "lb_flappycat_group" }
        ],
        [
          { text: "🏆 CatSweeper Global", callback_data: "lb_catsweeper_global" },
          { text: "🏆 CatSweeper Group", callback_data: "lb_catsweeper_group" }
        ]
      ]
    }
  });

  // Send game launchers separately
  ctx.replyWithGame("flappycat");
  ctx.replyWithGame("catsweeper");
});


// Legacy text commands (still work)
bot.command("flappycat", (ctx) => ctx.replyWithGame("flappycat"));
bot.command("catsweeper", (ctx) => ctx.replyWithGame("catsweeper"));

bot.command("leaderboard", async (ctx) => {
  const parts = ctx.message.text.split(" ");
  const game = parts[1];
  const scope = parts[2] || "global";

  if (!game || !GAMES[game]) {
    return ctx.reply("Usage: /leaderboard <flappycat|catsweeper> [global|group]");
  }

  const statName = scope === "group"
    ? `${game}_${ctx.chat.id}`
    : `${game}_global`;

  try {
    const list = await getLeaderboardCached(statName);
    if (!list.length) return ctx.reply("No scores yet 😺");

    let msg = `🏆 *${game} Leaderboard* (${scope})\n\n`;
    list.forEach((e, i) => {
      const name = e.DisplayName || `Player${i + 1}`;
      msg += `${i + 1}. ${name} — ${e.StatValue}\n`;
    });
    ctx.reply(msg, { parse_mode: "Markdown" });
  } catch (e) {
    console.error("Leaderboard error", e.response?.data || e.message);
    ctx.reply("⚠️ Failed to fetch leaderboard.");
  }
});

/* -------------------------------
   Callback handler
   ------------------------------- */
bot.on("callback_query", async (ctx) => {
  const q = ctx.update.callback_query;

  // Handle leaderboard menu
  if (q.data && q.data.startsWith("lb_")) {
    const [_, game, scope] = q.data.split("_");
    const statName = scope === "group"
      ? `${game}_${ctx.chat.id}`
      : `${game}_global`;

    try {
      const list = await getLeaderboardCached(statName);
      if (!list.length) return ctx.reply("No scores yet 😺");

      let msg = `🏆 *${game} Leaderboard* (${scope})\n\n`;
      list.forEach((e, i) => {
        const name = e.DisplayName || `Player${i + 1}`;
        msg += `${i + 1}. ${name} — ${e.StatValue}\n`;
      });
      ctx.reply(msg, { parse_mode: "Markdown" });
    } catch (e) {
      console.error("Leaderboard error", e.response?.data || e.message);
      ctx.reply("⚠️ Failed to fetch leaderboard.");
    }
  }

  // Handle game launches (Telegram injects short_name)
  if (q.game_short_name) {
    const shortName = q.game_short_name;
    if (!GAMES[shortName]) {
      return ctx.answerCbQuery("Unknown game!");
    }

    const url = new URL(GAMES[shortName]);
    url.searchParams.set("uid", q.from.id);
    url.searchParams.set("chat_id", q.message.chat.id);
    url.searchParams.set("message_id", q.message.message_id);
    url.searchParams.set("_ts", Date.now());

    const tgName = q.from.username || q.from.first_name || "Anonymous";
    url.searchParams.set("username", tgName);

    return ctx.telegram.answerGameQuery(q.id, url.toString());
  }
});

/* -------------------------------
   Webhook Mode (Render)
   ------------------------------- */
const PORT = process.env.PORT || 3000;
const DOMAIN = process.env.RENDER_EXTERNAL_URL;

if (!DOMAIN) {
  throw new Error("❌ Missing RENDER_EXTERNAL_URL environment variable");
}

bot.telegram.setWebhook(`${DOMAIN}/bot${BOT_TOKEN}`);
app.use(bot.webhookCallback(`/bot${BOT_TOKEN}`));

app.get("/", (req, res) => res.send("✅ Chilled Cat Bot is running via webhook"));

app.listen(PORT, () =>
  console.log(`🚀 Server running on ${PORT} with webhook mode`)
);
