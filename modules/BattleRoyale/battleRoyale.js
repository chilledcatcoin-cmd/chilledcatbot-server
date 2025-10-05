/**
 * =====================================================
 *  Chilled Cat Battle Royale - Core Logic Module
 * =====================================================
 *  Handles: game state, duels, and round events.
 *  Commands: /brstart /brcancel /brforceend /brjoin /brleave /roll /brstatus /br
 * =====================================================
 */

const {
  killEvents,
  reviveEvents,
  chillEvents,
  doubleKillEvents,
} = require("./events");

// ================================
// ⚙️ CONFIGURATION
// ================================
const CONFIG = {
  JOIN_DURATION: 60000,
  DUEL_TIMEOUT: 15000,
  ROUND_INTERVAL: 10000,
  RESET_JOIN_THRESHOLD: 5000,
  RESET_JOIN_TIME: 30000,
  DRAW_CHANCE: 0.001,
  STATUS_EVERY_N_ROUNDS: 3,
};

// ================================
// 🧠 GAME STATE
// ================================
let gameState = {
  active: false,
  joinOpen: false,
  alive: [],
  dead: [],
  startTime: null,
  timers: [],
  rounds: 0,
};

let duel = {
  active: false,
  playerA: null,
  playerB: null,
  rolls: {},
  timeout: null,
};

/* -----------------------------------------------------
 * Helper Functions
 * ----------------------------------------------------- */

function announce(ctx, msg) {
  ctx.telegram.sendMessage(ctx.chat.id, msg, { parse_mode: "Markdown" });
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickPair() {
  const a = pick(gameState.alive);
  const b = pick(gameState.alive.filter((x) => x !== a));
  return [a, b];
}

/* -----------------------------------------------------
 *  Game Lifecycle
 * ----------------------------------------------------- */

async function startBattle(ctx) {
  const member = await ctx.telegram.getChatMember(ctx.chat.id, ctx.from.id);
  if (member.status !== "administrator" && member.status !== "creator")
    return ctx.reply("😾 Only admins can start a Battle Royale!");

  if (gameState.active) return ctx.reply("⚠️ A battle is already running!");

  gameState = {
    active: true,
    joinOpen: true,
    alive: [],
    dead: [],
    startTime: Date.now(),
    timers: [],
    rounds: 0,
  };

  announce(
    ctx,
    `🐾 *${ctx.from.first_name}* has started the **Chilled Cat Battle Royale!**\nType /brjoin to enter — gates close in 60 seconds!`
  );

  const startJoinTimers = () => {
    gameState.timers.forEach(clearTimeout);
    gameState.timers = [
      setTimeout(() => {
        if (gameState.active && gameState.joinOpen)
          announce(ctx, "⏳ 30 seconds left to join! Type /brjoin to enter!");
      }, CONFIG.JOIN_DURATION - 30000),
      setTimeout(() => {
        if (gameState.active && gameState.joinOpen)
          announce(ctx, "⏳ 10 seconds left! Type /brjoin to enter!");
      }, CONFIG.JOIN_DURATION - 10000),
      setTimeout(() => {
        if (gameState.active && gameState.joinOpen) startRounds(ctx);
      }, CONFIG.JOIN_DURATION),
    ];
  };

  gameState.resetJoinTimer = () => {
    announce(ctx, "⚡ A new challenger has entered! Timer reset to 30 seconds!");
    gameState.timers.forEach(clearTimeout);
    gameState.startTime = Date.now();
    gameState.timers = [
      setTimeout(() => {
        if (gameState.active && gameState.joinOpen)
          announce(ctx, "⏳ 15 seconds left to join! Type /brjoin to enter!");
      }, CONFIG.RESET_JOIN_TIME - 15000),
      setTimeout(() => {
        if (gameState.active && gameState.joinOpen)
          announce(ctx, "⏳ 10 seconds left! Type /brjoin to enter!");
      }, CONFIG.RESET_JOIN_TIME - 10000),
      setTimeout(() => {
        if (gameState.active && gameState.joinOpen) startRounds(ctx);
      }, CONFIG.RESET_JOIN_TIME),
    ];
  };

  startJoinTimers();
}

function joinBattle(ctx) {
  if (!gameState.active || !gameState.joinOpen)
    return ctx.reply("No active Battle Royale. Wait for an admin to start one.");

  const name = `@${ctx.from.username || ctx.from.first_name}`;
  if (gameState.alive.includes(name)) return ctx.reply("😼 You’re already in!");

  gameState.alive.push(name);

  const elapsed = Date.now() - gameState.startTime;
  let remainingSec = Math.max(0, Math.floor((CONFIG.JOIN_DURATION - elapsed) / 1000));

  if (remainingSec <= CONFIG.RESET_JOIN_THRESHOLD / 1000) {
    gameState.startTime = Date.now();
    gameState.resetJoinTimer();
    remainingSec = CONFIG.RESET_JOIN_TIME / 1000;
  }

  announce(
    ctx,
    `😺 ${name} has joined the battle!\nType /brjoin to enter — gates close in *${remainingSec} seconds!*`
  );
}

function leaveBattle(ctx) {
  if (!gameState.active) return ctx.reply("No battle running right now.");

  const name = `@${ctx.from.username || ctx.from.first_name}`;
  if (!gameState.alive.includes(name))
    return ctx.reply("You’re not part of this match, silly cat.");

  gameState.alive = gameState.alive.filter((p) => p !== name);
  gameState.dead.push(name);
  announce(ctx, `💀 ${name} has left the arena.`);
}

async function cancelBattle(ctx) {
  const member = await ctx.telegram.getChatMember(ctx.chat.id, ctx.from.id);
  if (member.status !== "administrator" && member.status !== "creator")
    return ctx.reply("😾 Only admins can cancel a battle.");

  if (!gameState.active) return ctx.reply("No battle to cancel.");
  gameState.active = false;
  gameState.timers.forEach(clearTimeout);
  announce(ctx, "❌ The Chilled Cat Battle Royale has been cancelled.");
}

/* -----------------------------------------------------
 * ⚡ Force End (Admin Command)
 * ----------------------------------------------------- */
async function forceEndBattle(ctx) {
  const member = await ctx.telegram.getChatMember(ctx.chat.id, ctx.from.id);
  if (member.status !== "administrator" && member.status !== "creator")
    return ctx.reply("😾 Only admins can force-end a battle.");

  if (!gameState.active) return ctx.reply("No active battle to end.");

  if (gameState.alive.length === 0)
    return announce(ctx, "😿 All cats are gone... No winner today!");

  const winner = pick(gameState.alive);
  announce(
    ctx,
    `💥 *${ctx.from.first_name}* has force-ended the Battle Royale!\n\n🏆 *${winner}* is declared the **Chillest Cat Alive™!** 😼`
  );

  gameState.active = false;
  gameState.joinOpen = false;
  gameState.timers.forEach(clearTimeout);
}

/* -----------------------------------------------------
 *  Battle Flow
 * ----------------------------------------------------- */

function startRounds(ctx) {
  gameState.joinOpen = false;
  gameState.rounds = 0;

  if (gameState.alive.length < 2) {
    announce(ctx, "😿 Not enough cats joined. Battle cancelled.");
    gameState.active = false;
    return;
  }

  announce(ctx, "⏰ Time’s up! The arena fills with fog... Let the chaos begin!");

  const interval = setInterval(() => {
    if (!gameState.active) return clearInterval(interval);
    if (gameState.alive.length <= 1) {
      endBattle(ctx);
      clearInterval(interval);
      return;
    }
    doRound(ctx);
  }, CONFIG.ROUND_INTERVAL);
}

/* -----------------------------------------------------
 *  Rounds & Duels
 * ----------------------------------------------------- */

function doRound(ctx) {
  gameState.rounds++;

  if (gameState.rounds % CONFIG.STATUS_EVERY_N_ROUNDS === 0) {
    announce(
      ctx,
      `📢 *Round ${gameState.rounds} Update!*\n😼 Alive: *${gameState.alive.length}* | 💀 Dead: *${gameState.dead.length}*\n🌪️ The battle rages on...`
    );
  }

  if (Math.random() < 0.1 && gameState.alive.length >= 2) return triggerDuel(ctx);

  const roll = Math.random();
  if (roll < 0.6) killEvent(ctx);
  else if (roll < 0.8) chillEvent(ctx);
  else if (roll < 0.95) reviveEvent(ctx);
  else doubleKillEvent(ctx);
}

function triggerDuel(ctx) {
  if (duel.active) return;
  const [A, B] = pickPair();
  duel = { active: true, playerA: A, playerB: B, rolls: {} };

  announce(
    ctx,
    `⚔️ A duel begins between ${A} and ${B}!\nThey have *${CONFIG.DUEL_TIMEOUT / 1000} seconds* to /roll — highest roll survives!`
  );

  duel.timeout = setTimeout(() => resolveDuel(ctx), CONFIG.DUEL_TIMEOUT);
}

async function handleRoll(ctx) {
  const name = `@${ctx.from.username || ctx.from.first_name}`;
  if (!duel.active) return ctx.reply("🎮 There’s no active duel!");
  if (![duel.playerA, duel.playerB].includes(name))
    return ctx.reply("😼 You’re not part of the duel!");
  if (duel.rolls[name]) return ctx.reply("🐾 You already rolled!");

  const emoji = pick(["🎲", "🎯", "🏀", "🎳", "🎰"]);
  const diceMsg = await ctx.telegram.sendDice(ctx.chat.id, { emoji });
  const roll = diceMsg.dice.value;
  duel.rolls[name] = roll;

  await ctx.telegram.sendMessage(ctx.chat.id, `${emoji} ${name} rolled a *${roll}*!`, { parse_mode: "Markdown" });

  if (duel.rolls[duel.playerA] && duel.rolls[duel.playerB]) {
    clearTimeout(duel.timeout);
    resolveDuel(ctx);
  }
}

function resolveDuel(ctx) {
  const { playerA, playerB, rolls } = duel;
  duel.active = false;

  const rollA = rolls[playerA];
  const rollB = rolls[playerB];

  if (!rollA && !rollB) announce(ctx, `💀 Neither ${playerA} nor ${playerB} rolled! Both perish.`), eliminate(ctx, [playerA, playerB]);
  else if (!rollA) announce(ctx, `💀 ${playerA} failed to roll and is eliminated!`), eliminate(ctx, [playerA]);
  else if (!rollB) announce(ctx, `💀 ${playerB} failed to roll and is eliminated!`), eliminate(ctx, [playerB]);
  else if (rollA > rollB) announce(ctx, `😼 ${playerA} wins! ${playerB} is eliminated!`), eliminate(ctx, [playerB]);
  else if (rollB > rollA) announce(ctx, `😼 ${playerB} wins! ${playerA} is eliminated!`), eliminate(ctx, [playerA]);
  else announce(ctx, `💥 It's a tie! Both are eliminated!`), eliminate(ctx, [playerA, playerB]);
}

/* -----------------------------------------------------
 *  Events & End Game
 * ----------------------------------------------------- */

function eliminate(ctx, players) {
  for (const p of players) {
    gameState.alive = gameState.alive.filter((x) => x !== p);
    gameState.dead.push(p);
  }
}

function killEvent(ctx) {
  if (gameState.alive.length < 2) return;
  const [A, B] = pickPair();
  announce(ctx, `🔥 ${pick(killEvents).replace("{A}", A).replace("{B}", B)}`);
  eliminate(ctx, [B]);
}

function doubleKillEvent(ctx) {
  if (gameState.alive.length < 3) return killEvent(ctx);
  const [A, B] = pickPair();
  announce(ctx, `💥 ${pick(doubleKillEvents).replace("{A}", A).replace("{B}", B)}`);
  eliminate(ctx, [A, B]);
}

function chillEvent(ctx) {
  announce(ctx, pick(chillEvents));
}

function reviveEvent(ctx) {
  if (!gameState.dead.length) return chillEvent(ctx);
  const revived = pick(gameState.dead);
  gameState.dead = gameState.dead.filter((p) => p !== revived);
  gameState.alive.push(revived);
  announce(ctx, pick(reviveEvents).replace("{B}", revived));
}

function endBattle(ctx) {
  gameState.active = false;
  if (Math.random() < CONFIG.DRAW_CHANCE)
    return announce(ctx, "😺 The battle ends in a *draw!* All cats nap peacefully. 💤");

  const winner = gameState.alive[0];
  const frames = ["😺 Spinning the Chill Wheel... ⏳", "🌪️", "💫", "😸"];
  let i = 0;
  const spin = setInterval(() => {
    announce(ctx, frames[i]);
    if (++i >= frames.length) {
      clearInterval(spin);
      announce(ctx, `🏆 *${winner}* is crowned the **Chillest Cat Alive™!** 😼`);
      announce(ctx, "🎉 The Battle Royale has ended. Thanks for playing!");
    }
  }, 800);
}

/* -----------------------------------------------------
 *  Commands
 * ----------------------------------------------------- */

function setupBattleRoyale(bot) {
  bot.command("brstart", startBattle);
  bot.command("brcancel", cancelBattle);
  bot.command("brforceend", forceEndBattle);
  bot.command("brjoin", joinBattle);
  bot.command("brleave", leaveBattle);
  bot.command("roll", handleRoll);

  bot.command("brstatus", (ctx) => {
    if (!gameState.active) return ctx.reply("😿 No active Battle Royale right now.");
    sendStatus(ctx);
  });

  bot.command("br", (ctx) => {
    let msg =
      "😺 *Chilled Cat Battle Royale Commands*\n\n" +
      "🏁 `/brstart` — Start a new battle (admin only)\n" +
      "❌ `/brcancel` — Cancel a battle (admin only)\n" +
      "💥 `/brforceend` — Force-end and declare winner (admin only)\n" +
      "🐾 `/brjoin` — Join the active battle\n" +
      "🚪 `/brleave` — Leave or forfeit\n" +
      "🎲 `/roll` — Roll during a duel\n" +
      "📊 `/brstatus` — Check game status\n\n";

    if (gameState.active) {
      if (gameState.joinOpen) {
        const elapsed = Date.now() - gameState.startTime;
        const remainingSec = Math.max(
          0,
          Math.floor((CONFIG.JOIN_DURATION - elapsed) / 1000)
        );
        msg += `🚪 *Lobby Open!*\nType /brjoin to enter — gates close in *${remainingSec} seconds!*`;
      } else {
        msg += `🔥 *Current Battle*\n😼 Alive: *${gameState.alive.length}* | 💀 Dead: *${gameState.dead.length}*\n`;
      }
    } else msg += "✨ No battle currently running. Start one with `/brstart`!";

    ctx.reply(msg, { parse_mode: "Markdown" });
  });

  console.log("✅ Battle Royale quick commands registered.");
}

function sendStatus(ctx) {
  let msg = `📊 *Battle Royale Status*\n\n😼 Alive: *${gameState.alive.length}* | 💀 Dead: *${gameState.dead.length}*\n\n`;
  if (gameState.alive.length) msg += `🐾 Alive:\n${gameState.alive.join(", ")}\n\n`;
  if (gameState.dead.length) msg += `🪦 Fallen:\n${gameState.dead.join(", ")}\n\n`;
  if (duel.active)
    msg += `⚔️ Duel in progress: ${duel.playerA} vs ${duel.playerB}`;
  else msg += "😺 No duel active right now.";
  ctx.reply(msg, { parse_mode: "Markdown" });
}

/* -----------------------------------------------------
 *  Exports
 * ----------------------------------------------------- */
module.exports = { setupBattleRoyale };
