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
 * 😺 Message Helper
 * ----------------------------------------------------- */
function sendMsg(ctx, text) {
  ctx.telegram.sendMessage(ctx.chat.id, text, { parse_mode: "Markdown" });
}

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

  sendMsg(
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
    sendMsg(ctx, "⚡ A new challenger has entered! Timer reset to 30 seconds!");
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

  sendMsg(
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
  sendMsg(ctx, `💀 ${name} has left the arena.`);
}

async function cancelBattle(ctx) {
  const member = await ctx.telegram.getChatMember(ctx.chat.id, ctx.from.id);
  if (member.status !== "administrator" && member.status !== "creator")
    return ctx.reply("😾 Only admins can cancel a battle.");

  if (!gameState.active) return ctx.reply("No battle to cancel.");
  gameState.active = false;
  gameState.timers.forEach(clearTimeout);
  sendMsg(ctx, "❌ The Chilled Cat Battle Royale has been cancelled.");
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
  sendMsg(
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
    sendMsg(ctx, "😿 Not enough cats joined. Battle cancelled.");
    gameState.active = false;
    return;
  }

  sendMsg(ctx, "⏰ Time’s up! The arena fills with fog... Let the chaos begin!");

  const telegram = ctx.telegram;
  const chatId = ctx.chat.id;

  const safeCtx = {
    telegram,
    chat: { id: chatId },
  };

  const interval = setInterval(() => {
    if (!gameState.active) return clearInterval(interval);

    if (gameState.alive.length <= 1) {
      endBattle(safeCtx);
      clearInterval(interval);
      return;
    }

    doRound(safeCtx);
  }, CONFIG.ROUND_INTERVAL);
}

/* -----------------------------------------------------
 *  Rounds & Duels
 * ----------------------------------------------------- */

function doRound(ctx) {
  gameState.rounds++;

  if (gameState.rounds % CONFIG.STATUS_EVERY_N_ROUNDS === 0) {
    sendMsg(
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

  sendMsg(ctx, `⚔️ A duel begins between ${A} and ${B}!\nThey have *${CONFIG.DUEL_TIMEOUT / 1000} seconds* to /roll — highest roll survives!`);
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

  if (!rollA && !rollB) sendMsg(ctx, `💀 Neither ${playerA} nor ${playerB} rolled! Both perish.`), eliminate(ctx, [playerA, playerB]);
  else if (!rollA) sendMsg(ctx, `💀 ${playerA} failed to roll and is eliminated!`), eliminate(ctx, [playerA]);
  else if (!rollB) sendMsg(ctx, `💀 ${playerB} failed to roll and is eliminated!`), eliminate(ctx, [playerB]);
  else if (rollA > rollB) sendMsg(ctx, `😼 ${playerA} wins! ${playerB} is eliminated!`), eliminate(ctx, [playerB]);
  else if (rollB > rollA) sendMsg(ctx, `😼 ${playerB} wins! ${playerA} is eliminated!`), eliminate(ctx, [playerA]);
  else sendMsg(ctx, `💥 It's a tie! Both perish!`), eliminate(ctx, [playerA, playerB]);

  gameState.alive = gameState.alive.filter(p => !gameState.dead.includes(p));
}

/* -----------------------------------------------------
 *  Utility: Eliminate players from alive list
 * ----------------------------------------------------- */
function eliminate(ctx, players) {
  for (const p of players) {
    gameState.alive = gameState.alive.filter((x) => x !== p);
    if (!gameState.dead.includes(p)) gameState.dead.push(p);
  }
}

/* -----------------------------------------------------
 *  Battle Events
 * ----------------------------------------------------- */
function killEvent(ctx) {
  if (gameState.alive.length < 2) return;
  const [A, B] = pickPair();
  const msg = pick(killEvents).replaceAll("{A}", A).replaceAll("{B}", B);
  eliminate(ctx, [B]);
  sendMsg(ctx, `🔥 ${msg}`);
}

function doubleKillEvent(ctx) {
  if (gameState.alive.length < 3) return killEvent(ctx);
  const [A, B] = pickPair();
  const msg = pick(doubleKillEvents).replaceAll("{A}", A).replaceAll("{B}", B);
  eliminate(ctx, [A, B]);
  sendMsg(ctx, `💥 ${msg}`);
}

function chillEvent(ctx) {
  const msg = pick(chillEvents);
  sendMsg(ctx, msg);
}

function reviveEvent(ctx) {
  if (gameState.dead.length === 0) return chillEvent(ctx);
  const revived = pick(gameState.dead);
  gameState.dead = gameState.dead.filter((p) => p !== revived);
  gameState.alive.push(revived);
  const msg = pick(reviveEvents).replace("{B}", revived);
  sendMsg(ctx, msg);
}

/* -----------------------------------------------------
 *  End Game
 * ----------------------------------------------------- */
function endBattle(ctx) {
  gameState.active = false;

  if (Math.random() < CONFIG.DRAW_CHANCE)
    return announce(ctx, "😺 The battle ends in a *draw!* All cats nap peacefully. 💤");

  const winner = gameState.alive.length > 0 ? gameState.alive[0] : null;
  const frames = ["😺 Spinning the Chill Wheel... ⏳", "🌪️", "💫", "😸"];
  let i = 0;

  const spin = setInterval(() => {
    announce(ctx, frames[i]);
    i++;

    if (i >= frames.length) {
      clearInterval(spin);

      if (winner) {
        announce(ctx, `🏆 ${winner} is crowned the *Chillest Cat Alive™!* 😼`);
      } else {
        announce(ctx, "😿 No cats survived... The fog claims all.");
      }

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
  bot.command("brstatus", (ctx) => sendStatus(ctx));
  bot.command("br", (ctx) => sendHelp(ctx));

  console.log("✅ Battle Royale quick commands registered.");
}

function sendStatus(ctx) {
  let msg = `📊 *Battle Royale Status*\n\n😼 Alive: *${gameState.alive.length}* | 💀 Dead: *${gameState.dead.length}*\n\n`;
  if (gameState.alive.length) msg += `🐾 Alive:\n${gameState.alive.join(", ")}\n\n`;
  if (gameState.dead.length) msg += `🪦 Fallen:\n${gameState.dead.join(", ")}\n\n`;
  if (duel.active) msg += `⚔️ Duel in progress: ${duel.playerA} vs ${duel.playerB}`;
  else msg += "😺 No duel active right now.";
  ctx.reply(msg, { parse_mode: "Markdown" });
}

function sendHelp(ctx) {
  ctx.reply(
    "😺 *Chilled Cat Battle Royale Commands*\n\n" +
      "🏁 `/brstart` — Start a new battle (admin)\n" +
      "❌ `/brcancel` — Cancel a battle (admin)\n" +
      "💥 `/brforceend` — Force-end and declare winner (admin)\n" +
      "🐾 `/brjoin` — Join the active battle\n" +
      "🚪 `/brleave` — Leave or forfeit\n" +
      "🎲 `/roll` — Roll during a duel\n" +
      "📊 `/brstatus` — Check game status\n\n" +
      "✨ Type `/brstart` or tap from the list below!",
    { parse_mode: "Markdown" }
  );
}

/* -----------------------------------------------------
 *  Exports
 * ----------------------------------------------------- */
module.exports = { setupBattleRoyale };
