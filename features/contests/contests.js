/**
 * =====================================================
 * ChilledCatBot - Contest System (Webhook-Safe Version)
 * =====================================================
 */

const { GAMES } = require("../games/games.js");
const { getLeaderboardCached, getStatName } = require("../leaderboard/leaderboard.js");
const { isWhitelisted } = require("../../modules/safecat/protector");

const contests = new Map();

/* -------------------------------
   Utility
   ------------------------------- */
function makeContestKey(game, chatId) {
  return `${game}_contest_${chatId}_${Date.now()}`;
}

function formatLeaderboard(game, list, ended = false, timeRemaining = null, groupTitle = "") {
  let msg = ended
    ? `🏁 *${GAMES[game].title}* Contest Ended!\n\n`
    : `🏆 *${GAMES[game].title}* Leaderboard Update\n`;

  if (groupTitle) msg += `📍 _${groupTitle}_\n\n`;

  if (!list || list.length === 0) {
    msg += "No scores yet. Be the first to play!";
    return msg;
  }

  list.forEach((entry, i) => {
    const name = entry.DisplayName || "Anonymous";
    msg += `${i + 1}. ${name} — ${entry.StatValue}\n`;
  });

  if (!ended && timeRemaining) {
    const mins = Math.floor(timeRemaining / 60000);
    const secs = Math.floor((timeRemaining % 60000) / 1000);
    msg += `\n⏳ Time remaining: ${mins}m ${secs}s`;
  }

  return msg;
}

/* -------------------------------
   Start Contest
   ------------------------------- */
async function startContest(ctx, game = "flappycat", minutes = 10) {
  if (!isWhitelisted(ctx.from.id)) {
    return ctx.reply("🚫 You are not whitelisted to start contests.");
  }

  const gameInfo = GAMES[game];
  if (!gameInfo) {
    return ctx.reply("⚠️ Unknown game. Try one of: " + Object.keys(GAMES).join(", "));
  }

  const key = makeContestKey(game, ctx.chat.id);
  const expires = Date.now() + minutes * 60 * 1000;
  const groupTitle = ctx.chat?.title || ctx.chat?.id;

  contests.set(ctx.chat.id, { game, key, expires, groupTitle });
  console.log(`📣 Contest started in chat ${ctx.chat.id} for ${game}`);

  const bot = ctx.telegram;
  const gameUrl = `${gameInfo.url}?contest=${key}&end=${expires}`;

  await bot.sendMessage(
    ctx.chat.id,
    `🎉 Contest started for *${gameInfo.title}*!\nRuns for ${minutes} minutes.\n\nPlay now to climb the leaderboard!`,
    { parse_mode: "Markdown" }
  );

  // ✅ Send proper play button with URL params
  await bot.sendMessage(ctx.chat.id, `🎮 Tap below to play *${gameInfo.title}* (Contest Mode):`, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: `▶️ Play ${gameInfo.title}`,
            url: gameUrl,
          },
        ],
      ],
    },
  });

  scheduleUpdates(bot, ctx.chat.id, game, key, expires);
}

/* -------------------------------
   End Contest
   ------------------------------- */
async function endContest(ctxOrBot, game = "flappycat", auto = false) {
  const chatId = ctxOrBot.chat?.id || ctxOrBot.chatId;
  const telegram = ctxOrBot.telegram || ctxOrBot.bot?.telegram || ctxOrBot; // ✅ Safe

  const c = contests.get(chatId);
  if (!c || c.game !== game) {
    return telegram.sendMessage(chatId, "⚠️ No active contest found.");
  }

  contests.delete(chatId);

  try {
    const list = await getLeaderboardCached(getStatName("contest", game, c.key));
    let msg;

    if (!list || list.length === 0) {
      msg =
        `🏁 *${GAMES[game].title}* Contest Ended!\n\n` +
        `📍 _${c.groupTitle}_\n\n` +
        "No one scored this round — it’s okay, we’re all still chilling 😺";
    } else {
      msg = formatLeaderboard(game, list, true, null, c.groupTitle);
    }

    await telegram.sendMessage(chatId, msg, { parse_mode: "Markdown" });
    console.log(`🏁 Contest ended for ${game} in chat ${chatId}`);
  } catch (err) {
    console.error("⚠️ Failed to send contest end message:", err);
  }
}

/* -------------------------------
   Scheduled Updates (Webhook Safe)
   ------------------------------- */
function scheduleUpdates(bot, chatId, game, key, expires) {
  const totalDuration = expires - Date.now();
  const interval = totalDuration / 4;
  const telegram = bot.telegram || bot; // ✅ ensure Telegram API object

  for (let i = 1; i <= 4; i++) {
    setTimeout(async () => {
      const c = contests.get(chatId);
      if (!c || c.key !== key) return;

      const now = Date.now();
      const timeRemaining = c.expires - now;

      // ⏳ If contest expired, skip (main timer will handle end)
      if (timeRemaining <= 0) return;

      try {
        const list = await getLeaderboardCached(getStatName("contest", game, key));
        const msg = formatLeaderboard(game, list, false, timeRemaining, c.groupTitle);
        await telegram.sendMessage(chatId, msg, { parse_mode: "Markdown" });
        console.log(`📢 Sent contest update ${i}/4 to chat ${chatId}`);
      } catch (err) {
        console.error("⚠️ Failed to send contest update:", err);
      }
    }, interval * i);
  }

  // 🏁 End contest automatically
  setTimeout(async () => {
    await endContest({ telegram, chatId }, game, true);
  }, totalDuration);
}

/* -------------------------------
   Export
   ------------------------------- */
module.exports = {
  contests,
  startContest,
  endContest,
};
