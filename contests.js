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

const contests = new Map(); // key: chat_id, value: { game, contestKey, expires }

/* Utility: make unique contest key */
function makeContestKey(game, chatId) {
  return `${game}_contest_${chatId}_${Date.now()}`;
}

/* Format leaderboard nicely */
function formatLeaderboard(game, scope, list, timeRemaining = null, final = false) {
  let msg = `🏆 *${game} Leaderboard* (${scope})\n\n`;

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
    msg += `\n⏳ Time remaining: *${Math.ceil(timeRemaining / 60000)}m*`;
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

  contests.set(ctx.chat.id, { game, contestKey, expires });

// Map short names to nice titles
const gameTitles = {
  flappycat: "Flappy Cat — A Chilled Cat Game",
  catsweeper: "CatSweeper ’97 — Minesweeper with Cats"
};

const niceName = gameTitles[game] || game;

ctx.reply(
  `🎉 Contest started for *Flappy Cat — A Chilled Cat Game*! Runs for ${minutes} minutes.\n` +
  `Use /flappycontest to check standings.`,
  { parse_mode: "Markdown" }
);

// Send a proper game button after the announcement
if (game === "flappycat") {
  ctx.reply("▶️ Play Flappy Cat", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "Play Flappy Cat", callback_game: {} }]
      ]
    }
  });
} else if (game === "catsweeper") {
  ctx.reply("▶️ Play CatSweeper", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "Play CatSweeper", callback_game: {} }]
      ]
    }
  });
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
          const msg = formatLeaderboard(game, "contest", list, timeRemaining, false);
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
          const msg = formatLeaderboard(game, "contest", list, null, true);
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
      const msg = formatLeaderboard(game, "contest", list, null, true);
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
function setupContests(bot) {
  bot.command("startcontest", async (ctx) => {
    const parts = ctx.message.text.split(" ");
    const game = parts[1];
    const minutes = parseInt(parts[2] || "10"); // default 10 minutes
    await startContest(ctx, game, minutes);
  });

  bot.command("endcontest", async (ctx) => {
    const parts = ctx.message.text.split(" ");
    const game = parts[1];
    if (!game) return ctx.reply("Usage: /endcontest <flappycat|catsweeper>");
    await endContest(ctx, game);
  });
}

module.exports = { contests, startContest, endContest, setupContests };