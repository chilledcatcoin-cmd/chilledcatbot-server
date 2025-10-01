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
 * Version: 1.4.0
 * Date: 2025-10-01
 *
 * Changelog:
 * v1.4.0 - Added contest system (admin-only, auto-expire)
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
   Leaderboard cache (30s TTL)
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
   Contest tracking (in-memory)
   ------------------------------- */
const contests = new Map(); // key: chat_id, value: { game, contestKey, expires }

/* Utility: create unique contest key */
function makeContestKey(game, chatId) {
  return `${game}_contest_${chatId}_${Date.now()}`;
}

/* -------------------------------
   Bot commands
   ------------------------------- */
bot.start((ctx) => {
  ctx.reply("😺 Welcome to *Chilled Cat Games!*\n\nCommands:\n" +
            "🎮 /flappycat — Play Flappy Cat\n" +
            "💣 /catsweeper — Play CatSweeper\n" +
            "🏆 /leaderboard <game> [global|group|contest]\n" +
            "🎯 /startcontest <game> <hours>\n" +
            "🏁 /endcontest <game>", 
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

  ctx.replyWithGame("flappycat");
  ctx.replyWithGame("catsweeper");
});

// Legacy commands
bot.command("flappycat", (ctx) => ctx.replyWithGame("flappycat"));
bot.command("catsweeper", (ctx) => ctx.replyWithGame("catsweeper"));

/* -------------------------------
   Leaderboard command
   ------------------------------- */
bot.command("leaderboard", async (ctx) => {
  const parts = ctx.message.text.split(" ");
  const game = parts[1];
  const scope = parts[2] || "global";

  if (!game || !GAMES[game]) {
    return ctx.reply("Usage: /leaderboard <flappycat|catsweeper> [global|group|contest]");
  }

  let statName;
  if (scope === "group") {
    statName = `${game}_${ctx.chat.id}`;
  } else if (scope === "contest") {
    const c = contests.get(ctx.chat.id);
    if (!c || c.game !== game || Date.now() > c.expires) {
      return ctx.reply("⚠️ No active contest for this game in this group.");
    }
    statName = c.contestKey;
  } else {
    statName = `${game}_global`;
  }

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
   Contest commands (admin-only in groups)
   ------------------------------- */
bot.command("startcontest", async (ctx) => {
  const parts = ctx.message.text.split(" ");
  const game = parts[1];
  const hours = parseInt(parts[2] || "24");

  if (!game || !GAMES[game]) {
    return ctx.reply("Usage: /startcontest <flappycat|catsweeper> <hours>");
  }

  // ✅ Check admin rights in groups
  if (ctx.chat.type.endsWith("group")) {
    try {
      const member = await ctx.telegram.getChatMember(ctx.chat.id, ctx.from.id);
      if (member.status !== "administrator" && member.status !== "creator") {
        return ctx.reply("⚠️ Only group admins can start contests.");
      }
    } catch (err) {
      console.error("Admin check failed:", err);
      return ctx.reply("⚠️ Could not verify admin rights.");
    }
  }

  const contestKey = makeContestKey(game, ctx.chat.id);
  const expires = Date.now() + hours * 3600 * 1000;

  contests.set(ctx.chat.id, { game, contestKey, expires });

  // Auto-expire cleanup
  setTimeout(() => {
    const c = contests.get(ctx.chat.id);
    if (c && c.contestKey === contestKey) {
      contests.delete(ctx.chat.id);
      console.log(`⏰ Contest expired: ${contestKey}`);
    }
  }, hours * 3600 * 1000);

  ctx.reply(`🎉 Contest started for *${game}*! Runs for ${hours}h.\n` +
            `Use /leaderboard ${game} contest to check standings.`,
            { parse_mode: "Markdown" });
});

bot.command("endcontest", async (ctx) => {
  const parts = ctx.message.text.split(" ");
  const game = parts[1];
  if (!game) return ctx.reply("Usage: /endcontest <flappycat|catsweeper>");

  // ✅ Check admin rights in groups
  if (ctx.chat.type.endsWith("group")) {
    try {
      const member = await ctx.telegram.getChatMember(ctx.chat.id, ctx.from.id);
      if (member.status !== "administrator" && member.status !== "creator") {
        return ctx.reply("⚠️ Only group admins can end contests.");
      }
    } catch (err) {
      console.error("Admin check failed:", err);
      return ctx.reply("⚠️ Could not verify admin rights.");
    }
  }

  const c = contests.get(ctx.chat.id);
  if (!c || c.game !== game) {
    return ctx.reply("⚠️ No active contest for this game.");
  }

  contests.delete(ctx.chat.id);
  ctx.reply(`🏁 Contest for *${game}* has ended!`, { parse_mode: "Markdown" });
});

/* -------------------------------
   Callback handler
   ------------------------------- */
bot.on("callback_query", async (ctx) => {
  const q = ctx.update.callback_query;

  // Handle leaderboard menu buttons
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

  // Handle game launches
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

    // If there’s an active contest for this chat/game, pass contestKey
    const c = contests.get(ctx.chat.id);
    if (c && c.game === shortName && Date.now() < c.expires) {
      url.searchParams.set("contest", c.contestKey);
    }

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

