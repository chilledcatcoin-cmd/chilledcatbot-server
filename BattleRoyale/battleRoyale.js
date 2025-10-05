// top of battleRoyale.js
const path = require("path");
const {
  killEvents,
  reviveEvents,
  chillEvents,
  doubleKillEvents,
} = require(path.join(__dirname, "events"));

let gameState = null;

function announce(ctx, msg) {
  ctx.telegram.sendMessage(ctx.chat.id, msg, { parse_mode: "Markdown" });
}

async function startBattle(ctx) {
  const member = await ctx.telegram.getChatMember(ctx.chat.id, ctx.from.id);
  if (member.status !== "administrator" && member.status !== "creator") {
    return ctx.reply("😾 Only group admins can start a Battle Royale!");
  }
  if (gameState && gameState.active) return ctx.reply("⚠️ A battle is already in progress!");

  gameState = {
    active: true,
    joinOpen: true,
    alive: [],
    dead: [],
    startTime: Date.now(),
  };

  announce(ctx, `🐾 *${ctx.from.first_name}* has opened the Chilled Cat Battle Royale!\nType /join to enter — gates close in 60 seconds!`);

  setTimeout(() => countdown(ctx, 30), 30000);
  setTimeout(() => countdown(ctx, 10), 50000);
  setTimeout(() => startRounds(ctx), 60000);
}

function countdown(ctx, seconds) {
  if (!gameState || !gameState.joinOpen) return;
  announce(ctx, `⏳ ${seconds} seconds left to join!`);
}

function joinBattle(ctx) {
  if (!gameState || !gameState.active || !gameState.joinOpen)
    return ctx.reply("No active Battle Royale. Wait for an admin to start one.");
  const name = `@${ctx.from.username || ctx.from.first_name}`;
  if (gameState.alive.includes(name)) return ctx.reply("😼 You’re already in!");
  gameState.alive.push(name);
  announce(ctx, `😺 ${name} has entered the arena!`);
}

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

    if (Date.now() - gameState.startTime > 5 * 60 * 1000) {
      announce(ctx, "⏰ The Battle Royale fizzled out… everyone’s too chill to fight.");
      gameState.active = false;
      return clearInterval(interval);
    }

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

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function killEvent(ctx) {
  if (gameState.alive.length < 2) return;
  const [A, B] = pickPair();
  const msg = pick(killEvents).replace("{A}", A).replace("{B}", B);
  gameState.alive = gameState.alive.filter(p => p !== B);
  gameState.dead.push(B);
  announce(ctx, `🔥 ${msg}`);
}

function doubleKillEvent(ctx) {
  if (gameState.alive.length < 3) return killEvent(ctx);
  const [A, B] = pickPair();
  const msg = pick(doubleKillEvents).replace("{A}", A).replace("{B}", B);
  gameState.alive = gameState.alive.filter(p => p !== A && p !== B);
  gameState.dead.push(A, B);
  announce(ctx, `💥 ${msg}`);
}

function chillEvent(ctx) {
  announce(ctx, pick(chillEvents));
}

function reviveEvent(ctx) {
  if (gameState.dead.length === 0) return chillEvent(ctx);
  const revived = pick(gameState.dead);
  gameState.dead = gameState.dead.filter(p => p !== revived);
  gameState.alive.push(revived);
  const msg = pick(reviveEvents).replace("{B}", revived);
  announce(ctx, msg);
}

function pickPair() {
  const a = pick(gameState.alive);
  let b = pick(gameState.alive.filter(x => x !== a));
  return [a, b];
}

function endBattle(ctx) {
  const winner = gameState.alive[0];
  announce(ctx, `🏆 ${winner} is the last cat standing!\nThey are now the *Chillest Cat Alive™!*`);
  logWinner(winner, gameState.alive.length + gameState.dead.length);
  gameState.active = false;
}

function logWinner(winner, total) {
  const file = path.join(__dirname, "battle_history.json");
  let data = [];
  try { data = JSON.parse(fs.readFileSync(file, "utf8")); } catch {}
  data.push({ winner, participants: total, date: new Date().toISOString() });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function setupBattleRoyale(bot) {
  bot.command("battle", async (ctx) => {
    const text = ctx.message.text.trim();
    if (text.includes("start")) {
      await startBattle(ctx);
    } else {
      await ctx.reply(
        "Usage: `/battle start` to begin a Battle Royale, then `/join` to enter.",
        { parse_mode: "Markdown" }
      );
    }
  });

  bot.command("join", (ctx) => joinBattle(ctx));
  console.log("✅ Battle Royale commands registered");
}

module.exports = { setupBattleRoyale, startBattle, joinBattle };
