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
 *        *:=....=**+:...........::..*.....+:*     /star
 *        **.....+*::=+::.::.....:*:**..:..+:*     
 *        **.....+:-+*:.:+::::**:-=::+.....+:*     
 *
 * =====================================================
 * ChilledCatBot - Contests - contests.js - Manages timed contests for groups
 * Version: 1.5.0
 * Date: 2025-10-01
 *
 * Changelog:
 * v1.4.0 - Start/end contests per group, Contest length in minutes, Auto-post top 10 leaderboard 4x during contest, Show time remaining in updates, Final standings with 🥇🥈🥉 medals
 * v1.4.0 - Added /startcontest and /endcontest
 * v1.3.0 - Contest tracking with auto-expire timers
 * =====================================================
 */

const { GAMES } = require("./games");
const { getLeaderboardCached } = require("./leaderboard");

const contests = new Map(); // key: chat_id, value: { game, contestKey, expires, groupTitle }

/* Utility: make unique contest key */
function makeContestKey(game, chatId) {
  return `${game}_contest_${chatId}_${Date.now()}`;
}

/* Format leaderboard nicely */
function formatLeaderboard(game, scope, list, timeRemaining = null, final = false, groupTitle = null) {
  let header = `🏆 *${game} Leaderboard* (${scope})`;
  if (groupTitle) header += `\n📌 Group: ${groupTitle}`;
  let msg = `${header}\n\n`;

  list.forEach((e, i) => {
    let name = e.DisplayName || `Player${i + 1}`;
    let line = `${i + 1}. ${name} — ${e.StatValue}`;

    if (final) {
      if (i === 0) line = `🥇 ${line}`;
      if (i === 1) line = `🥈 ${line}`;
      if (i === 2) line = `🥉 ${line}`;
    }

    msg += line + "\n";
  });

  if (timeRemaining) {
    const mins = Math.floor(timeRemaining / 60000);
    const secs = Math.floor((timeRemaining % 60000) / 1000);
    msg += `\n⏳ Time remaining: *${mins}m ${secs}s*`;
  }

  if (final) {
    msg += `\n\n🏁 Contest ended, congrats to all who played!`;
  }

  return msg;
}

/* Start contest */
async function startContest(ctx, game, minutes) {
  if (!game || !GAMES[game]) {
    return ctx.reply("Usage: /startcontest <flappycat|catsweeper> <minutes>");
  }

  const contestKey = makeContestKey(game, ctx.chat.id);
  const expires = Date.now() + minutes * 60 * 1000;

  // ✅ store group title too
  contests.set(ctx.chat.id, { game, contestKey, expires, groupTitle: ctx.chat.title });

// Map short names to nice titles + their contest command
const gameTitles = {
  flappycat: {
    title: "Flappy Cat — A Chilled Cat Game",
    contestCmd: "/flappycontest"
  },
  catsweeper: {
    title: "CatSweeper ’97 — Minesweeper with Cats",
    contestCmd: "/sweepercontest"
  }
};

const niceName = gameTitles[game]?.title || game;
const contestCmd = gameTitles[game]?.contestCmd || `/${game}contest`;

ctx.reply(
  `🎉 Contest started for *${niceName}*! Runs for ${minutes} minutes.\n` +
  `Use ${contestCmd} to check standings.`,
  { parse_mode: "Markdown" }
);

  // ✅ Send proper game button
  if (game === "flappycat") {
    ctx.replyWithGame("flappycat");
  } else if (game === "catsweeper") {
    ctx.replyWithGame("catsweeper");
  }

  // Schedule auto-post updates (4x during contest)
  const intervalMs = (minutes * 60 * 1000) / 4;
  for (let i = 1; i <= 4; i++) {
    setTimeout(async () => {
      const c = contests.get(ctx.chat.id);
      if (!c || c.contestKey !== contestKey || Date.now() > c.expires) return;

      try {
        const list = await getLeaderboardCached(c.contestKey);
        if (list.length) {
          const timeRemaining = c.expires - Date.now();
          const msg = formatLeaderboard(game, "contest", list, timeRemaining, false, c.groupTitle);
          ctx.reply(msg, { parse_mode: "Markdown" });
        }
      } catch (err) {
        console.error("Auto-post leaderboard failed:", err);
      }
    }, intervalMs * i);
  }

  // Auto-expire contest
  setTimeout(async () => {
    const c = contests.get(ctx.chat.id);
    if (c && c.contestKey === contestKey) {
      contests.delete(ctx.chat.id);

      try {
        const list = await getLeaderboardCached(contestKey);
        if (list.length) {
          const msg = formatLeaderboard(game, "contest", list, null, true, c.groupTitle);
          ctx.reply(msg, { parse_mode: "Markdown" });
        } else {
          ctx.reply(`🏁 Contest for *${game}* ended. No scores recorded.`, { parse_mode: "Markdown" });
        }
      } catch (err) {
        console.error("Final leaderboard fetch failed:", err);
        ctx.reply(`🏁 Contest for *${game}* ended.`, { parse_mode: "Markdown" });
      }
    }
  }, minutes * 60 * 1000);
}

/* End contest manually */
async function endContest(ctx, game) {
  if (!game) {
    return ctx.reply("Usage: /endcontest <flappycat|catsweeper>");
  }

  const c = contests.get(ctx.chat.id);

  if (!c) {
    return ctx.reply("⚠️ There is no active contest in this group.");
  }

  if (c.game !== game) {
    return ctx.reply(`⚠️ The active contest is for *${c.game}*, not ${game}.`, { parse_mode: "Markdown" });
  }

  if (Date.now() > c.expires) {
    contests.delete(ctx.chat.id);
    return ctx.reply(`⚠️ The contest for *${c.game}* has already expired.`, { parse_mode: "Markdown" });
  }

  // ✅ End the contest
  contests.delete(ctx.chat.id);

  try {
    const list = await getLeaderboardCached(c.contestKey);
    if (list.length) {
      const msg = formatLeaderboard(game, "contest", list, null, true, c.groupTitle);
      ctx.reply(msg, { parse_mode: "Markdown" });
    } else {
      ctx.reply(`🏁 Contest for *${game}* ended. No scores recorded.`, { parse_mode: "Markdown" });
    }
  } catch (err) {
    console.error("Manual contest end fetch failed:", err);
    ctx.reply(`🏁 Contest for *${game}* ended.`, { parse_mode: "Markdown" });
  }
}

/* Wire contest commands into the bot */
const { isWhitelisted } = require("./config/whitelist");

function setupContests(bot) {
  bot.command("startcontest", async (ctx) => {
    try {
      if (ctx.chat.type === "private")
        return ctx.reply("🚫 This command only works in group chats.");

      const member = await ctx.getChatMember(ctx.from.id);
      const userId = ctx.from.id;

      // ✅ allow group admins OR whitelisted users
      if (
        !["creator", "administrator"].includes(member.status) &&
        !isWhitelisted(userId)
      ) {
        return ctx.reply("🚫 Only group admins or whitelisted users can start contests.");
      }

      const parts = ctx.message.text.split(" ");
      const game = parts[1];
      const minutes = parseInt(parts[2] || "10");
      await startContest(ctx, game, minutes);
    } catch (err) {
      console.error(err);
      ctx.reply("⚠️ Unable to start contest. Please try again.");
    }
  });

  bot.command("endcontest", async (ctx) => {
    try {
      if (ctx.chat.type === "private")
        return ctx.reply("🚫 This command only works in group chats.");

      const member = await ctx.getChatMember(ctx.from.id);
      const userId = ctx.from.id;

      if (
        !["creator", "administrator"].includes(member.status) &&
        !isWhitelisted(userId)
      ) {
        return ctx.reply("🚫 Only group admins or whitelisted users can end contests.");
      }

      const parts = ctx.message.text.split(" ");
      const game = parts[1];
      if (!game) return ctx.reply("Usage: /endcontest <flappycat|catsweeper>");
      await endContest(ctx, game);
    } catch (err) {
      console.error(err);
      ctx.reply("⚠️ Unable to end contest. Please try again.");
    }
  });
}

module.exports = { contests, startContest, endContest, setupContests };