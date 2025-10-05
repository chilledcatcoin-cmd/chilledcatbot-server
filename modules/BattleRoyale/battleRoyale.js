/**
 * =====================================================
 *  Chilled Cat Battle Royale - Core Logic Module
 * =====================================================
 *  Handles: game state, events, timing, duels,
 *  and Telegram command integration.
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
  JOIN_DURATION: 60000,       // 60s to join at start
  DUEL_TIMEOUT: 15000,        // 15s for duel rolls
  ROUND_INTERVAL: 10000,      // 10s between round events
  RESET_JOIN_THRESHOLD: 5000, // if someone joins under 5s left → reset to 30s
  RESET_JOIN_TIME: 30000,     // reset join timer to 30s
  DRAW_CHANCE: 0.001,         // 0.1% chance of peaceful draw
  STATUS_EVERY_N_ROUNDS: 3,   // Post battle status every 3 rounds automatically
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
 *  Helper Functions
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
  if (member.status !== "administrator" && member.status !== "creator") {
    return ctx.reply("😾 Only admins can start a Battle Royale!");
  }

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
    `🐾 *${ctx.from.first_name}* has opened the **Chilled Cat Battle Royale!**\nType /joinbr to enter — gates close in 60 seconds!`
  );

  const startJoinTimers = () => {
    gameState.timers.forEach((t) => clearTimeout(t));
    gameState.timers = [
      setTimeout(() => {
        if (gameState.active && gameState.joinOpen)
          announce(ctx, "⏳ 30 seconds left to join! Type /joinbr to enter!");
      }, CONFIG.JOIN_DURATION - 30000),

      setTimeout(() => {
        if (gameState.active && gameState.joinOpen)
          announce(ctx, "⏳ 10 seconds left! Type /joinbr to enter!");
      }, CONFIG.JOIN_DURATION - 10000),

      setTimeout(() => {
        if (gameState.active && gameState.joinOpen) startRounds(ctx);
      }, CONFIG.JOIN_DURATION),
    ];
  };

  // Timer reset (when someone joins last second)
  gameState.resetJoinTimer = () => {
    announce(ctx, "⚡ A new challenger has entered! Timer reset to 30 seconds!");
    gameState.timers.forEach((t) => clearTimeout(t));
    gameState.timers = [
      setTimeout(() => {
        if (gameState.active && gameState.joinOpen)
          announce(ctx, "⏳ 15 seconds left to join! Type /joinbr to enter!");
      }, CONFIG.RESET_JOIN_TIME - 15000),
      setTimeout(() => {
        if (gameState.active && gameState.joinOpen)
          announce(ctx, "⏳ 10 seconds left! Type /joinbr to enter!");
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
  if (gameState.alive.includes(name))
    return ctx.reply("😼 You’re already in!");

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
    `😺 ${name} has joined the battle!\nType /joinbr to enter — gates close in *${remainingSec} seconds!*`
  );
}

function forfeitBattle(ctx) {
  if (!gameState.active) return ctx.reply("No battle running right now.");

  const name = `@${ctx.from.username || ctx.from.first_name}`;
  if (!gameState.alive.includes(name))
    return ctx.reply("You’re not part of this match, silly cat.");

  gameState.alive = gameState.alive.filter((p) => p !== name);
  gameState.dead.push(name);
  announce(ctx, `💀 ${name} has forfeited and left the arena.`);
}

async function cancelBattle(ctx) {
  const member = await ctx.telegram.getChatMember(ctx.chat.id, ctx.from.id);
  if (member.status !== "administrator" && member.status !== "creator") {
    return ctx.reply("😾 Only admins can cancel a battle.");
  }

  if (!gameState.active) return ctx.reply("No battle to cancel.");
  gameState.active = false;
  if (gameState.timers) gameState.timers.forEach((t) => clearTimeout(t));
  announce(ctx, "❌ The Chilled Cat Battle Royale has been cancelled.");
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
 *  Rounds and Events
 * ----------------------------------------------------- */

function doRound(ctx) {
  gameState.rounds++;

  if (gameState.rounds % CONFIG.STATUS_EVERY_N_ROUNDS === 0) {
    let msg = `📢 *Round ${gameState.rounds} Update!*\n\n`;
    msg += `😼 Alive: *${gameState.alive.length}*\n💀 Dead: *${gameState.dead.length}*\n\n`;
    msg += duel.active
      ? `⚔️ Duel in progress: ${duel.playerA} vs ${duel.playerB}\n`
      : `🌪️ The battle rages on...`;
    announce(ctx, msg);
  }

  if (Math.random() < 0.1 && gameState.alive.length >= 2) {
    triggerDuel(ctx);
    return;
  }

  const roll = Math.random();
  if (roll < 0.6) killEvent(ctx);
  else if (roll < 0.8) chillEvent(ctx);
  else if (roll < 0.95) reviveEvent(ctx);
  else doubleKillEvent(ctx);
}

/* -----------------------------------------------------
 *  Duels
 * ----------------------------------------------------- */

function triggerDuel(ctx) {
  if (duel.active) return;

  const [A, B] = pickPair();
  duel = { active: true, playerA: A, playerB: B, rolls: {} };

  announce(
    ctx,
    `⚔️ A duel has begun between ${A} and ${B}!\nThey have *${CONFIG.DUEL_TIMEOUT / 1000} seconds* to /roll — highest roll survives!`
  );

  duel.timeout = setTimeout(() => {
    resolveDuel(ctx);
  }, CONFIG.DUEL_TIMEOUT);
}

async function handleRoll(ctx) {
  const name = `@${ctx.from.username || ctx.from.first_name}`;

  if (!duel.active) return ctx.reply("🎮 There’s no active duel right now!");
  if (![duel.playerA, duel.playerB].includes(name))
    return ctx.reply("😼 You’re not part of the current duel!");
  if (duel.rolls[name]) return ctx.reply("🐾 You already rolled!");

  const diceOptions = [
    "🎲", "🎯", "🏀", "🎳", "🎰"
  ];
  const emoji = pick(diceOptions);
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

  if (rollA === undefined && rollB === undefined) {
    announce(ctx, `💀 Neither ${playerA} nor ${playerB} rolled! Both perish.`);
    eliminatePlayers(ctx, [playerA, playerB]);
  } else if (rollA === undefined) {
    announce(ctx, `💀 ${playerA} failed to roll and is eliminated!`);
    eliminatePlayers(ctx, [playerA]);
  } else if (rollB === undefined) {
    announce(ctx, `💀 ${playerB} failed to roll and is eliminated!`);
    eliminatePlayers(ctx, [playerB]);
  } else if (rollA > rollB) {
    announce(ctx, `😼 ${playerA} wins the duel! ${playerB} has been eliminated!`);
    eliminatePlayers(ctx, [playerB]);
  } else if (rollB > rollA) {
    announce(ctx, `😼 ${playerB} wins the duel! ${playerA} has been eliminated!`);
    eliminatePlayers(ctx, [playerA]);
  } else {
    announce(ctx, `💥 It's a tie! Both ${playerA} and ${playerB} are eliminated!`);
    eliminatePlayers(ctx, [playerA, playerB]);
  }
}

/* -----------------------------------------------------
 *  Normal Events
 * ----------------------------------------------------- */

function eliminatePlayers(ctx, players) {
  for (const p of players) {
    gameState.alive = gameState.alive.filter((x) => x !== p);
    gameState.dead.push(p);
  }
}

function killEvent(ctx) {
  if (gameState.alive.length < 2) return;
  const [A, B] = pickPair();
  const msg = pick(killEvents).replace("{A}", A).replace("{B}", B);
  gameState.alive = gameState.alive.filter((p) => p !== B);
  gameState.dead.push(B);
  announce(ctx, `🔥 ${msg}`);
}

function doubleKillEvent(ctx) {
  if (gameState.alive.length < 3) return killEvent(ctx);
  const [A, B] = pickPair();
  const msg = pick(doubleKillEvents).replace("{A}", A).replace("{B}", B);
  gameState.alive = gameState.alive.filter((p) => p !== A && p !== B);
  gameState.dead.push(A, B);
  announce(ctx, `💥 ${msg}`);
}

function chillEvent(ctx) {
  announce(ctx, pick(chillEvents));
}

function reviveEvent(ctx) {
  if (gameState.dead.length === 0) return chillEvent(ctx);
  const revived = pick(gameState.dead);
  gameState.dead = gameState.dead.filter((p) => p !== revived);
  gameState.alive.push(revived);
  const msg = pick(reviveEvents).replace("{B}", revived);
  announce(ctx, msg);
}

/* -----------------------------------------------------
 *  End Game
 * ----------------------------------------------------- */

function endBattle(ctx) {
  gameState.active = false;
  const isDraw = Math.random() < CONFIG.DRAW_CHANCE;

  if (isDraw) {
    announce(ctx, "😺 The battle ends in a *draw!* Everyone curls up for a nap. 💤");
    announce(ctx, "✨ Thanks for playing Chilled Cat Battle Royale! ✨");
    return;
  }

  const winner = gameState.alive[0];
  const spinFrames = [
    "😺 Spinning the Chill Wheel... ⏳",
    "😺 Spinning the Chill Wheel... 🌪️",
    "😺 Spinning the Chill Wheel... 💫",
    "😺 Spinning the Chill Wheel... 😸",
  ];

  let i = 0;
  const spinInterval = setInterval(() => {
    announce(ctx, spinFrames[i]);
    i++;
    if (i >= spinFrames.length) {
      clearInterval(spinInterval);
      announce(ctx, `🏆 *${winner}* emerges victorious!\nThey are now crowned the **Chillest Cat Alive™!** 😼`);
      announce(ctx, "🎉 The Battle Royale has ended. Thanks for playing, meow!");
    }
  }, 800);
}

/* -----------------------------------------------------
 *  Commands
 * ----------------------------------------------------- */

function setupBattleRoyale(bot) {
  bot.command("battleroyale", async (ctx) => {
    const text = ctx.message.text.trim().toLowerCase();
    if (text.includes("start")) return startBattle(ctx);
    if (text.includes("cancel")) return cancelBattle(ctx);

    return ctx.reply(
      "😺 *Chilled Cat Battle Royale*\n\n" +
        "Commands:\n" +
        "🐾 `/battleroyale start` — Start a new match (admin only)\n" +
        "😼 `/joinbr` — Join an active battle\n" +
        "💀 `/brforfeit` — Forfeit mid-battle\n" +
        "🎲 `/roll` — Roll during a duel\n" +
        "📊 `/battlestatus` — Check current status\n" +
        "❌ `/battleroyale cancel` — Cancel a match (admin only)",
      { parse_mode: "Markdown" }
    );
  });

  bot.command("joinbr", (ctx) => joinBattle(ctx));
  bot.command("brforfeit", (ctx) => forfeitBattle(ctx));
  bot.command("roll", (ctx) => handleRoll(ctx));

  bot.command("battlestatus", (ctx) => {
    if (!gameState.active)
      return ctx.reply("😿 No active Battle Royale right now.");

    let msg = `📊 *Battle Status*\n\n😼 Alive: *${gameState.alive.length}*\n💀 Dead: *${gameState.dead.length}*\n\n`;

    if (gameState.alive.length) msg += `🐾 Alive Cats:\n${gameState.alive.join(", ")}\n\n`;
    if (gameState.dead.length) msg += `🪦 Fallen Cats:\n${gameState.dead.join(", ")}\n\n`;

    if (duel.active) msg += `⚔️ *Duel in progress:* ${duel.playerA} vs ${duel.playerB}\n`;
    else msg += "😺 No duel active right now.";

    ctx.reply(msg, { parse_mode: "Markdown" });
  });

  console.log("✅ Battle Royale commands registered.");
}

/* -----------------------------------------------------
 *  Exports
 * ----------------------------------------------------- */
module.exports = {
  setupBattleRoyale,
  startBattle,
  joinBattle,
  forfeitBattle,
  cancelBattle,
};
