/**
 * =====================================================
 *  Chilled Cat Battle Royale - Core Logic Module
 * =====================================================
 *  Handles: game state, events, timing, winners,
 *  logging, and Telegram command integration.
 * =====================================================
 */

const fs = require("fs");
const path = require("path");
const {
  killEvents,
  reviveEvents,
  chillEvents,
  doubleKillEvents,
} = require("./events");

const HISTORY_FILE = path.join(__dirname, "battle_history.json");

// Game state in memory
let gameState = {
  active: false,
  joinOpen: false,
  alive: [],
  dead: [],
  startTime: null,
};

/* -----------------------------------------------------
 * Helper Functions
 * ----------------------------------------------------- */

/** Send a message safely to the group. */
function announce(ctx, msg) {
  ctx.telegram.sendMessage(ctx.chat.id, msg, { parse_mode: "Markdown" });
}

/** Random utility picker */
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Randomly choose two distinct players */
function pickPair() {
  const a = pick(gameState.alive);
  let b = pick(gameState.alive.filter((x) => x !== a));
  return [a, b];
}

/** Safely load battle history file */
function readHistory() {
  try {
    return JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8"));
  } catch {
    return [];
  }
}

/** Append a record to the battle history */
function logWinner(winner, total) {
  const data = readHistory();
  data.push({ winner, participants: total, date: new Date().toISOString() });
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(data, null, 2));
  console.log(`📜 Logged result: ${winner} (${total} cats)`);
}

/* -----------------------------------------------------
 *  Game Lifecycle Functions
 * ----------------------------------------------------- */

/** Admin starts a new Battle Royale */
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
  };

  announce(
    ctx,
    `🐾 *${ctx.from.first_name}* has opened the **Chilled Cat Battle Royale!**\nType /joinbr to enter — gates close in 60 seconds!`
  );

// Store join phase timers so they can be cleared if cancelled
gameState.timers = [
  setTimeout(() => {
    if (gameState.active && gameState.joinOpen) announce(ctx, "⏳ 30 seconds left to join!");
  }, 30000),

  setTimeout(() => {
    if (gameState.active && gameState.joinOpen) announce(ctx, "⏳ 10 seconds left!");
  }, 50000),

  setTimeout(() => {
    if (gameState.active && gameState.joinOpen) startRounds(ctx);
  }, 60000),
];
}

/** Player joins the match */
function joinBattle(ctx) {
  if (!gameState.active || !gameState.joinOpen) {
    return ctx.reply("No active Battle Royale. Wait for an admin to start one.");
  }

  const name = `@${ctx.from.username || ctx.from.first_name}`;
  if (gameState.alive.includes(name)) return ctx.reply("😼 You’re already in!");

  gameState.alive.push(name);
  announce(ctx, `😺 ${name} has joined the battle!`);
}

/** Player forfeits mid-match */
function forfeitBattle(ctx) {
  if (!gameState.active) return ctx.reply("No battle running right now.");

  const name = `@${ctx.from.username || ctx.from.first_name}`;
  if (!gameState.alive.includes(name)) {
    return ctx.reply("You’re not part of this match, silly cat.");
  }

  gameState.alive = gameState.alive.filter((p) => p !== name);
  gameState.dead.push(name);
  announce(ctx, `💀 ${name} has forfeited and left the arena.`);
}

/** Admin cancels a match */
async function cancelBattle(ctx) {
  const member = await ctx.telegram.getChatMember(ctx.chat.id, ctx.from.id);
  if (member.status !== "administrator" && member.status !== "creator") {
    return ctx.reply("😾 Only admins can cancel a battle.");
  }

  if (!gameState.active) return ctx.reply("No battle to cancel.");
  gameState.active = false;
// Clear all pending timers
if (gameState.timers) {
  for (const t of gameState.timers) clearTimeout(t);
  gameState.timers = [];
}
  announce(ctx, "❌ The Chilled Cat Battle Royale has been cancelled.");
}

/** Show recent results */
function showHistory(ctx) {
  const data = readHistory();
  if (!data.length) return ctx.reply("No battle history yet 😿");

  const recent = data.slice(-5).reverse();
  let msg = "📜 *Recent Battle Royale Results:*\n\n";
  for (const r of recent) {
    const date = new Date(r.date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    msg += `🏁 ${date} — *${r.winner}* (${r.participants} cats)\n`;
  }
  ctx.reply(msg, { parse_mode: "Markdown" });
}

/* -----------------------------------------------------
 *  Game Engine (Rounds + Events)
 * ----------------------------------------------------- */
function startRounds(ctx) {
  gameState.joinOpen = false;
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
  }, 10000);
}

function doRound(ctx) {
  const roll = Math.random();
  if (roll < 0.6) killEvent(ctx);
  else if (roll < 0.8) chillEvent(ctx);
  else if (roll < 0.95) reviveEvent(ctx);
  else doubleKillEvent(ctx);
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
 *  End Game Sequence
 * ----------------------------------------------------- */
function endBattle(ctx) {
  gameState.active = false;

  // 0.1% draw chance
  const isDraw = Math.random() < 0.001;

  if (isDraw) {
    announce(
      ctx,
      "😺 The battle ends in a *draw!* The cats are too chill to keep fighting.\nEveryone curls up for a group nap. 💤"
    );
    announce(ctx, "✨ Thanks for playing Chilled Cat Battle Royale! ✨");
    logWinner("DRAW", gameState.alive.length + gameState.dead.length);
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
      announce(
        ctx,
        `🏆 *${winner}* emerges victorious!\nThey are now crowned the **Chillest Cat Alive™!** 😼`
      );
      announce(
        ctx,
        "🎉 Congratulations! The Battle Royale has ended.\nThanks for playing *Chilled Cat Battle Royale!*"
      );
      logWinner(winner, gameState.alive.length + gameState.dead.length);
    }
  }, 800);
}

/* -----------------------------------------------------
 *  Command Registration (used by commands.js)
 * ----------------------------------------------------- */
function setupBattleRoyale(bot) {
  bot.command("battleroyale", async (ctx) => {
    const text = ctx.message.text.trim().toLowerCase();
    if (text.includes("start")) return startBattle(ctx);
    if (text.includes("cancel")) return cancelBattle(ctx);
    if (text.includes("history")) return showHistory(ctx);

    return ctx.reply(
      "😺 *Chilled Cat Battle Royale*\n\n" +
        "Commands:\n" +
        "🐾 `/battleroyale start` — Start a new match (admin only)\n" +
        "😼 `/joinbr` — Join an active battle\n" +
        "💀 `/brforfeit` — Forfeit mid-battle\n" +
        "📜 `/battleroyale history` — View recent results\n" +
        "❌ `/battleroyale cancel` — Cancel a match (admin only)",
      { parse_mode: "Markdown" }
    );
  });

  bot.command("joinbr", (ctx) => joinBattle(ctx));
  bot.command("brforfeit", (ctx) => forfeitBattle(ctx));
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
  showHistory,
};
