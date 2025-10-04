
// /CoC/game.js
const { assignRoles, sendRoleDMs } = require("./roles_core");
const { revealRoles, shuffle, parseTarget, findGameByPlayer, roleEmoji } = require("./utils");

const games = {}; // per-chat storage

function setupGame(bot) {
  bot.command("join", (ctx) => {
    const chatId = ctx.chat.id;
    if (!games[chatId]) games[chatId] = createNewGame(chatId);
    const game = games[chatId];
    const userId = ctx.from.id;
    const username = ctx.from.username || ctx.from.first_name;
    if (game.phase !== "lobby") return ctx.reply("😿 Game already started.");
    if (!game.players[userId]) {
      game.players[userId] = { username, alive: true, role: null };
      ctx.reply(`😺 ${username} joined the Chill House!`);
    }
  });

  bot.command("leave", (ctx) => {
    const chatId = ctx.chat.id;
    const game = games[chatId];
    if (!game) return ctx.reply("No game running.");
    delete game.players[ctx.from.id];
    ctx.reply(`🚪 ${ctx.from.username} left the Chill House.`);
  });

  bot.command("startgame", (ctx) => {
    const chatId = ctx.chat.id;
    const game = games[chatId];
    if (!game) return ctx.reply("No players joined yet.");
    const count = Object.keys(game.players).length;
    if (count < 5) return ctx.reply("😿 Need at least 5 cats to vibe.");
    game.starterId = ctx.from.id;
    assignRoles(game);
    ctx.reply("🌙 The game begins… cats curl up, but Chaos stirs.");
    sendRoleDMs(bot, game);
    nightPhase(bot, game);
  });

  bot.command("roles", (ctx) => {
    const roleList = require("./roles_meme").possibleRoles;
    ctx.reply("📜 Possible Roles:\n\n" + roleList.map(r => `• ${r}`).join("\n"));
  });

  bot.command("status", (ctx) => {
    const chatId = ctx.chat.id;
    const game = games[chatId];
    if (!game) return ctx.reply("No game running.");
    const alive = Object.values(game.players).filter(p => p.alive).map(p => p.username);
    ctx.reply("😺 Alive cats: " + alive.join(", "));
  });

  bot.command("endgame", async (ctx) => {
    const chatId = ctx.chat.id;
    const game = games[chatId];
    if (!game) return ctx.reply("No game running.");
    if (game.phase === "ended" || game.phase === "lobby") return ctx.reply("❌ No active game.");
    const userId = ctx.from.id;
    const isStarter = game.starterId === userId;
    let isAdmin = false;
    try {
      const member = await ctx.getChatMember(userId);
      if (["administrator", "creator"].includes(member.status)) isAdmin = true;
    } catch {}
    if (!isStarter && !isAdmin) return ctx.reply("🚫 Only the starter or admin can end the game.");
    ctx.reply("⏹️ Game manually ended by the cats.");
    revealRoles(bot, game);
    game.phase = "ended";
  });

  bot.command("newgame", async (ctx) => {
    const chatId = ctx.chat.id;
    games[chatId] = createNewGame(chatId);
    ctx.reply("🔄 A new lobby has been created! Cats can now /join again.");
  });
}

function createNewGame(chatId) {
  return { chatId, starterId: null, players: {}, phase: "lobby", nightActions: {}, votes: {}, history: [] };
}

function nightPhase(bot, game) {
  game.phase = "night";
  game.nightActions = {};
  bot.telegram.sendMessage(game.chatId, "🌌 Night falls… check your DMs for actions.");
}

module.exports = { setupGame };
