/**
 * =====================================================
 * ChilledCatBot - Contest System - contests.js
 * =====================================================
 */

const { GAMES } = require("../games/games.js");
console.log("🎮 Loaded games in contests:", Object.keys(GAMES || {}));
console.log("🎮 Contest Games Loaded:", GAMES);
const { getLeaderboardCached, getStatName } = require("../leaderboard");
const { isWhitelisted } = require("../../modules/safecat/protector");

// Debug check
console.log("🧩 Contest whitelist import:", typeof isWhitelisted);

const contests = new Map();

function makeContestKey(game, chatId) {
  return `${game}_${chatId}_${Date.now()}`;
}

function formatLeaderboard(game, list, final = false, timeRemaining = null, groupTitle = null) {
  const title = GAMES[game]?.title || game;
  let msg = `🏆 *${title} Leaderboard*`;
  if (groupTitle) msg += `\n📌 Group: ${groupTitle}`;
  msg += "\n\n";

  if (!list.length) return msg + "_(No scores yet)_";

  // ✅ Limit to top 5
  const topList = list.slice(0, 5);

  topList.forEach((entry, i) => {
    const name = entry.DisplayName || `Player${i + 1}`;
    const value = entry.StatValue || 0;
    let line = `${i + 1}. ${name} — ${value}`;
    if (final) {
      if (i === 0) line = `🥇 ${line}`;
      else if (i === 1) line = `🥈 ${line}`;
      else if (i === 2) line = `🥉 ${line}`;
    }
    msg += line + "\n";
  });

  if (timeRemaining) {
    const mins = Math.floor(timeRemaining / 60000);
    const secs = Math.floor((timeRemaining % 60000) / 1000);
    msg += `\n⏳ Time remaining: *${mins}m ${secs}s*`;
  }

  if (final) msg += `\n\n🏁 Contest ended. Congrats to all players!`;

  return msg;
}

async function startContest(ctx, game, minutes = 10) {
  // ✅ Whitelist check (simple and early)
  if (!isWhitelisted(ctx.from.id)) {
    return ctx.reply("🚫 You are not whitelisted to start contests.");
  }

  if (!GAMES[game]) {
    return ctx.reply("⚠️ Unknown game. Try one of: " + Object.keys(GAMES).join(", "));
  }

  const key = makeContestKey(game, ctx.chat.id);
  const expires = Date.now() + minutes * 60 * 1000;
  const groupTitle = ctx.chat?.title || ctx.chat?.id;

  contests.set(ctx.chat.id, { game, key, expires, groupTitle });

  const gameInfo = GAMES[game];
  await ctx.replyWithMarkdown(
    `🎉 Contest started for *${gameInfo.title}*!\nRuns for ${minutes} minutes.\n[Play Now](${gameInfo.url})`,
    { disable_web_page_preview: false }
  );

  scheduleUpdates(ctx, game, key, expires);
}

function scheduleUpdates(ctx, game, key, expires) {
  const totalDuration = expires - Date.now();
  const interval = totalDuration / 4;

  for (let i = 1; i <= 4; i++) {
    setTimeout(async () => {
      const c = contests.get(ctx.chat.id);
      if (!c || c.key !== key || Date.now() > c.expires) return;

      const list = await getLeaderboardCached(getStatName("contest", game, key));
      const timeRemaining = c.expires - Date.now();
      const msg = formatLeaderboard(game, list, false, timeRemaining, c.groupTitle);
      ctx.reply(msg, { parse_mode: "Markdown" });
    }, interval * i);
  }

  setTimeout(() => endContest(ctx, game, true), totalDuration);
}

async function endContest(ctx, game, auto = false) {
  const c = contests.get(ctx.chat.id);
  if (!c || c.game !== game) {
    if (!auto) ctx.reply("⚠️ No active contest for this game.");
    return;
  }

  contests.delete(ctx.chat.id);

  const list = await getLeaderboardCached(getStatName("contest", game, c.key));
  const msg = formatLeaderboard(game, list, true, null, c.groupTitle);
  ctx.reply(msg, { parse_mode: "Markdown" });
}

function setupContests(bot) {
bot.command("startcontest", async (ctx) => {
  const parts = ctx.message.text.split(" ").filter(Boolean);
  const game = parts[1]?.replace(/^@.*bot$/i, "") || parts[2]; // skip @bot username if present
  const minutes = parseInt(parts[2]) || 10;

  if (!game) {
    return ctx.reply("Usage: /startcontest <game> [minutes]");
  }

  await startContest(ctx, game.toLowerCase(), minutes);
});

  bot.command("endcontest", async (ctx) => {
    const [_, game] = ctx.message.text.split(" ");
    await endContest(ctx, game);
  });

  console.log("🏆 Contest system ready for all games.");
}

module.exports = { contests, startContest, endContest, setupContests };
