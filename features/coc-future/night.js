// 🌙 Chilled Cat: Chill or Chaos — Night Phase Logic
// Handles DM prompts, action collection, and resolution.

const coreRoles = require("./roles_core");
const memeRoles = require("./roles_meme");

let nightTimers = {};
let nightActions = {};

function startNightPhase(chatId, bot, game) {
  game.phase = "night";
  nightActions[chatId] = {};
  bot.sendMessage(chatId, "🌙 Night descends... Chilled Cat yawns dramatically. Somewhere, a Chaos Cat sharpens its claws.");

  // DM all players with night actions
  game.players.forEach((p) => {
    if (!p.alive) return;
    const role = p.role;
    if (role.nightAction) {
      try {
        bot.sendMessage(
          p.id,
          `🌙 Night has fallen, ${p.name}.\n` +
          `Role: *${role.name}*\n\n${role.prompt || "No action tonight."}`
        );
      } catch (err) {
        bot.sendMessage(chatId, `⚠️ Could not DM ${p.name}. They might need to click *Start* in private chat.`);
      }
    }
  });

  // Night duration (for testing ~45s)
  const NIGHT_DURATION = 45000;
  nightTimers[chatId] = setTimeout(() => resolveNight(chatId, bot, game), NIGHT_DURATION);
}

// called when user DMs bot with an action
function recordAction(user, command, targetUser, chatId) {
  if (!nightActions[chatId]) nightActions[chatId] = {};
  nightActions[chatId][user.id] = { command, target: targetUser };
}

// resolves all collected actions
function resolveNight(chatId, bot, game) {
  clearTimeout(nightTimers[chatId]);
  const actions = nightActions[chatId] || {};
  const allRoles = { ...coreRoles, ...memeRoles };
  game.pendingKills = [];
  game.protected = null;

  bot.sendMessage(chatId, "🌘 The night is ending... cats stretch and sharpen their claws.");

  // Process actions
  Object.entries(actions).forEach(([uid, act]) => {
    const player = game.players.find(p => p.id == uid);
    if (!player || !player.alive) return;
    const role = player.role;
    const target = game.players.find(p => p.username === act.target?.replace("@", "")) ||
                   game.players.find(p => p.name.toLowerCase() === act.target?.toLowerCase());
    if (role && role.resolve) {
      try { role.resolve(game, player, target, bot); } catch (err) { console.error(err); }
    }
  });

  // Determine victims
  let killedId = null;
  if (game.pendingKills.length) {
    game.pendingKills.forEach(kid => {
      if (kid !== game.protected) killedId = kid;
    });
  }

  setTimeout(() => {
    if (killedId) {
      const victim = game.players.find(p => p.id === killedId);
      if (victim) {
        victim.alive = false;
        bot.sendMessage(chatId, `😿 Morning breaks... ${victim.name} didn’t wake up. The nap was... permanent.`);
      }
    } else {
      bot.sendMessage(chatId, "☀️ Morning breaks... everyone survived the night! Maybe too chill to attack?");
    }

    bot.sendMessage(chatId, "😺 The sun is up — it’s time for the Day Phase!");
    const day = require("./day");
    day.startDayPhase(chatId, bot, game);
  }, 3000);
}

module.exports = { startNightPhase, resolveNight, recordAction };
