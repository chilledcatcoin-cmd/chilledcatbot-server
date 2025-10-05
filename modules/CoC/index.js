// 🐾 Chilled Cat: Chill or Chaos — Main Command Setup

const game = require("./game");
const night = require("./night");
const day = require("./day");

// This function wires up all CoC commands to your Telegram bot instance
function setupChillOrChaos(bot) {
  // 🐾 Lobby commands
  bot.onText(/\/newgame/, (msg) => {
    const chatId = msg.chat.id;
    game.newGame(chatId, bot);
  });

  bot.onText(/\/join/, (msg) => {
    const chatId = msg.chat.id;
    const user = msg.from;
    game.joinGame(chatId, user, bot);
  });

  bot.onText(/\/extend/, (msg) => {
    const chatId = msg.chat.id;
    const user = msg.from;
    game.extendLobby(chatId, bot, user);
  });

  bot.onText(/\/endgame/, (msg) => {
    const chatId = msg.chat.id;
    game.endGame(chatId, bot, "Game ended manually by admin.");
  });

  // 🕓 Status check
  bot.onText(/\/status/, (msg) => {
    const chatId = msg.chat.id;
    game.getStatus(chatId, bot);
  });

  // 🌙 Night commands (via DM)
  bot.onText(/\/target (.+)/, (msg, match) => {
    const target = match[1];
    const user = msg.from;
    const chatId = findGameByPlayer(user.id);
    if (!chatId) return bot.sendMessage(user.id, "😿 You’re not in any active game!");
    night.recordAction(user, "/target", target, chatId);
    bot.sendMessage(user.id, `😈 You chose to target ${target}.`);
  });

  bot.onText(/\/protect (.+)/, (msg, match) => {
    const target = match[1];
    const user = msg.from;
    const chatId = findGameByPlayer(user.id);
    if (!chatId) return bot.sendMessage(user.id, "😿 You’re not in any active game!");
    night.recordAction(user, "/protect", target, chatId);
    bot.sendMessage(user.id, `💉 You decided to protect ${target}.`);
  });

  bot.onText(/\/peek (.+)/, (msg, match) => {
    const target = match[1];
    const user = msg.from;
    const chatId = findGameByPlayer(user.id);
    if (!chatId) return bot.sendMessage(user.id, "😿 You’re not in any active game!");
    night.recordAction(user, "/peek", target, chatId);
    bot.sendMessage(user.id, `🔮 You peeked at ${target}. Results will be revealed in the morning.`);
  });

  // ☀️ Daytime vote
  bot.onText(/\/vote (.+)/, (msg, match) => {
    const target = match[1];
    const user = msg.from;
    const chatId = findGameByPlayer(user.id);
    if (!chatId) return bot.sendMessage(user.id, "😿 You’re not in any active game!");
    day.recordVote(user, target, chatId, bot);
  });
}

// Helper to find which chat a player belongs to
function findGameByPlayer(userId) {
  for (const [chatId, g] of Object.entries(game.games)) {
    if (g.players.find(p => p.id === userId && p.alive)) {
      return chatId;
    }
  }
  return null;
}

module.exports = { setupChillOrChaos };
