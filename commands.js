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
 * ChilledCatBot - Commands - commands.js - Registers /start, /menu, /leaderboard
 * Version: 1.4.0
 * Date: 2025-10-01
 *
 * Changelog:
 * v1.4.0 - Extracted commands into own file
 * v1.3.0 - Added inline keyboards to /menu
 * v1.2.0 - Leaderboard supports global + group
 * v1.0.0 - Basic /start + /flappycat + /catsweeper
 * =====================================================
 */

const { GAMES } = require("./games");
const { getLeaderboardCached } = require("./leaderboard");
const { contests, startContest, endContest } = require("./contests");

/* -------------------------------
   Leaderboard Sender
   ------------------------------- */
async function sendLeaderboard(ctx, game, scope = "global") {
  if (!game || !GAMES[game]) {
    return ctx.reply("Usage: /leaderboard <flappycat|catsweeper> [global|group|contest]");
  }

  let statName;
  let timeRemaining;

  if (scope === "group") {
    statName = `${game}_${ctx.chat.id}`;
  } else if (scope === "contest") {
    const c = contests.get(ctx.chat.id);
    if (!c || c.game !== game) {
      return ctx.reply("⚠️ There is no active contest for this game right now.");
    }
    if (Date.now() > c.expires) {
      return ctx.reply("🏁 The contest has ended. Start a new one with /startcontest.");
    }
    statName = c.contestKey;
    timeRemaining = c.expires - Date.now();
  } else if (scope === "global") {
    statName = `${game}_global`;
  } else {
    return ctx.reply("⚠️ Invalid scope. Use: global, group, or contest.");
  }

  try {
    const list = await getLeaderboardCached(statName);
    if (!list.length) return ctx.reply("No scores yet 😺");

    let msg = `🏆 *${game} Leaderboard* (${scope})\n\n`;
    list.forEach((e, i) => {
      const name = e.DisplayName || `Player${i + 1}`;
      msg += `${i + 1}. ${name} — ${e.StatValue}\n`;
    });

    // show time left in contest
    if (scope === "contest" && timeRemaining > 0) {
      const mins = Math.floor(timeRemaining / 60000);
      const secs = Math.floor((timeRemaining % 60000) / 1000);
      msg += `\n⏳ Time remaining: *${mins}m ${secs}s*`;
    }

    ctx.reply(msg, { parse_mode: "Markdown" });
  } catch (e) {
    console.error("Leaderboard error", e.response?.data || e.message);
    ctx.reply("⚠️ Failed to fetch leaderboard.");
  }
}

/* -------------------------------
   Commands Setup
   ------------------------------- */
function setupCommands(bot) {
  bot.start((ctx) => {
    ctx.reply("😺 Welcome to *Chilled Cat Games!*\n\nCommands:\n" +
      "🎮 /flappycat — Play Flappy Cat\n" +
      "💣 /catsweeper — Play CatSweeper\n" +
      "🏆 /leaderboard <game> [global|group|contest]\n" +
      "🎯 /startcontest <game> <minutes>\n" +
      "🏁 /endcontest <game>\n" +
      "📊 /flappycontest — View Flappy Cat contest\n" +
      "📊 /sweepercontest — View CatSweeper contest",
      { parse_mode: "Markdown" });
  });

  bot.command("flappycat", (ctx) => ctx.replyWithGame("flappycat"));
  bot.command("catsweeper", (ctx) => ctx.replyWithGame("catsweeper"));

  // General leaderboard
  bot.command("leaderboard", async (ctx) => {
    const parts = ctx.message.text.split(" ");
    const game = parts[1];
    const scope = parts[2] || "global";
    await sendLeaderboard(ctx, game, scope);
  });

  // Short leaderboard commands
  bot.command("flappyglobal", (ctx) => sendLeaderboard(ctx, "flappycat", "global"));
  bot.command("flappygroup", (ctx) => sendLeaderboard(ctx, "flappycat", "group"));

  bot.command("flappycontest", async (ctx) => {
    // show contest for this group
    await sendLeaderboard(ctx, "flappycat", "contest");

    // also list other active contests
    let msg = "\n📢 Active contests in other groups:\n";
    let found = false;
    contests.forEach((c, chatId) => {
      if (c.game === "flappycat" && chatId !== ctx.chat.id && Date.now() < c.expires) {
        const mins = Math.ceil((c.expires - Date.now()) / 60000);
        msg += `- ${c.groupTitle || "Group"} (${mins}m left)\n`;
        found = true;
      }
    });
    if (found) ctx.reply(msg);
  });

  bot.command("sweeperglobal", (ctx) => sendLeaderboard(ctx, "catsweeper", "global"));
  bot.command("sweepergroup", (ctx) => sendLeaderboard(ctx, "catsweeper", "group"));

  bot.command("sweepercontest", async (ctx) => {
    await sendLeaderboard(ctx, "catsweeper", "contest");

    let msg = "\n📢 Active contests in other groups:\n";
    let found = false;
    contests.forEach((c, chatId) => {
      if (c.game === "catsweeper" && chatId !== ctx.chat.id && Date.now() < c.expires) {
        const mins = Math.ceil((c.expires - Date.now()) / 60000);
        msg += `- ${c.groupTitle || "Group"} (${mins}m left)\n`;
        found = true;
      }
    });
    if (found) ctx.reply(msg);
  });

  /* -------------------------------
     Contest Commands
     ------------------------------- */
  bot.command("startcontest", async (ctx) => {
    if (ctx.chat.type === "private") {
      return ctx.reply("⚠️ Contests can only be started in groups.");
    }

    const parts = ctx.message.text.split(" ");
    const game = parts[1];
    const minutes = parseInt(parts[2] || "30"); // default 30m

    // Admin check
    try {
      const member = await ctx.telegram.getChatMember(ctx.chat.id, ctx.from.id);
      if (member.status !== "administrator" && member.status !== "creator") {
        return ctx.reply("⚠️ Only group admins can start contests.");
      }
    } catch (err) {
      console.error("Admin check failed:", err);
      return ctx.reply("⚠️ Could not verify admin rights.");
    }

    // pass group title to contests.js
    startContest(ctx, game, minutes, ctx.chat.title);
  });

  bot.command("endcontest", async (ctx) => {
    if (ctx.chat.type === "private") {
      return ctx.reply("⚠️ Contests can only be ended in groups.");
    }

    const parts = ctx.message.text.split(" ");
    const game = parts[1];
    endContest(ctx, game);
  });

  /* -------------------------------
     Game Launch via Callback
     ------------------------------- */
  bot.on("callback_query", async (ctx) => {
    const q = ctx.update.callback_query;

    if (q.game_short_name) {
      const shortName = q.game_short_name;
      if (!GAMES[shortName]) return ctx.answerCbQuery("Unknown game!");

      const url = new URL(GAMES[shortName]);
      url.searchParams.set("uid", q.from.id);
      url.searchParams.set("chat_id", q.message.chat.id);
      url.searchParams.set("message_id", q.message.message_id);
      url.searchParams.set("_ts", Date.now());

      const tgName = q.from.username || q.from.first_name || "Anonymous";
      url.searchParams.set("username", tgName);

      const c = contests.get(ctx.chat.id);
      if (c && c.game === shortName && Date.now() < c.expires) {
        url.searchParams.set("contest", c.contestKey);
      }

      return ctx.telegram.answerGameQuery(q.id, url.toString());
    }
  });
}

module.exports = { setupCommands };
