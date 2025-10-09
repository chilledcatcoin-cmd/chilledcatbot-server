// ☀️ Chilled Cat: Chill or Chaos — Day Phase Logic
// Handles voting, meme narration, and the end-of-cycle summary.

let dayTimers = {};
let votes = {};

function startDayPhase(chatId, bot, game) {
  game.phase = "day";
  votes[chatId] = {};
  bot.sendMessage(
    chatId,
    "☀️ The sun rises over Chilled Town. Cats gather sleepily in the courtyard.\n\n" +
    "😺 Use /vote @username to vote for who you think caused chaos last night.\n" +
    "You have 45 seconds before the next nap cycle begins!"
  );

  const DAY_DURATION = 45000;
  dayTimers[chatId] = setTimeout(() => resolveDay(chatId, bot, game), DAY_DURATION);
}

// Records a vote
function recordVote(user, target, chatId, bot) {
  if (!votes[chatId]) votes[chatId] = {};
  if (!target) {
    bot.sendMessage(user.id, "😿 You need to vote for someone using /vote @username");
    return;
  }
  votes[chatId][user.id] = target;
  bot.sendMessage(user.id, `🗳️ You voted for ${target}.`);
  bot.sendMessage(chatId, `🐾 ${user.first_name} has cast their vote.`);
}

// Tallies votes and ends the test cycle
function resolveDay(chatId, bot, game) {
  clearTimeout(dayTimers[chatId]);
  const chatVotes = votes[chatId] || {};
  const tally = {};
  for (const voter in chatVotes) {
    const target = chatVotes[voter];
    if (!tally[target]) tally[target] = 0;
    tally[target]++;
  }

  let topTarget = null;
  let topVotes = 0;
  for (const [target, count] of Object.entries(tally)) {
    if (count > topVotes) {
      topVotes = count;
      topTarget = target;
    }
  }

  if (topTarget) {
    const victim = game.players.find(
      p => p.username === topTarget.replace("@", "") ||
           p.name.toLowerCase() === topTarget.toLowerCase()
    );
    if (victim && victim.alive) {
      victim.alive = false;
      bot.sendMessage(chatId, `😿 The cats have spoken... ${victim.name} has been voted out for excessive chaos!`);
    } else {
      bot.sendMessage(chatId, "🤔 The vote was confusing. Nobody was eliminated — maybe too many naps.");
    }
  } else {
    bot.sendMessage(chatId, "😹 No votes were cast. Everyone just kinda... vibed.");
  }

  setTimeout(() => {
    bot.sendMessage(
      chatId,
      "🏁 *The Chilled of Chills (Test Cycle)* concludes.\n\n" +
      "Half the cats went back to napping; the rest started a meme war.\n" +
      "Thank you for participating in the Night of Chaos!\n\n" +
      "You can type /newgame to start again."
    );
    game.phase = "ended";
  }, 4000);
}

module.exports = { startDayPhase, recordVote };
