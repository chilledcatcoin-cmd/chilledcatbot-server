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

function setupCommands(bot) {
  bot.start((ctx) => {
    ctx.reply("😺 Welcome to *Chilled Cat Games!*\n\nCommands:\n" +
      "🎮 /flappycat — Play Flappy Cat\n" +
      "💣 /catsweeper — Play CatSweeper\n" +
      "🏆 /leaderboard <game> [global|group|contest]\n" +
      "🎯 /startcontest <game> <minutes>\n" +
      "🏁 /endcontest <game>",
      { parse_mode: "Markdown" });
  });

  bot.command("flappycat", (ctx) => ctx.replyWithGame("flappycat"));
  bot.command("catsweeper", (ctx) => ctx.replyWithGame("catsweeper"));

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
     Contest Commands
     ------------------------------- */
  bot.command("startcontest", async (ctx) => {
    const parts = ctx.message.text.split(" ");
    const game = parts[1];
    const minutes = parseInt(parts[2] || "30"); // default 30m if not set

    // Admin check for groups
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

    startContest(ctx, game, minutes);
  });

  bot.command("endcontest", async (ctx) => {
    const parts = ctx.message.text.split(" ");
    const game = parts[1];

    // Admin check for groups
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

      // If contest active, attach contest key
      const c = contests.get(ctx.chat.id);
      if (c && c.game === shortName && Date.now() < c.expires) {
        url.searchParams.set("contest", c.contestKey);
      }

      return ctx.telegram.answerGameQuery(q.id, url.toString());
    }
  });
}

module.exports = { setupCommands };