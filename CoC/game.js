
const utils = require("./utils");
const coreRoles = require("./roles_core");
const memeRoles = require("./roles_meme");

const games = {}; // active game states per chat
let lobbyTimers = {};           // per-chat active timeout
let lobbyDeadline = {};         // per-chat end timestamp
let extendedLobbies = {};       // tracks if /extend used

const MIN_PLAYERS = 3;            
const LOBBY_TIMEOUT = 120000;    
const WARNING_60 = 60000;
const WARNING_30 = 90000;

async function joinGame(chatId, user, bot) {
  const game = games[chatId];
  if (!game || game.phase !== "lobby") return;

  const alreadyJoined = game.players.find(p => p.id === user.id);
  if (alreadyJoined) {
    bot.sendMessage(chatId, `${user.first_name} is already in the lobby!`);
    return;
  }

  game.players.push({ id: user.id, name: user.first_name });
  bot.sendMessage(chatId, `🐱 ${user.first_name} has joined the nap party! (${game.players.length} cats now.)`);

  // DM the player
  try {
    await bot.sendMessage(
      user.id,
      `😺 Welcome to *Chilled of Chills*, ${user.first_name}!\n\n` +
      `You’ve joined the game in \"${game.chatTitle || 'this group'}\".\n` +
      `Stay tuned — your secret role and night actions will appear here when the game begins. 🕵️‍♂️\n\n` +
      `If you don’t see future messages here, make sure you’ve clicked *Start* on me in private chat!`
    );
  } catch (err) {
    bot.sendMessage(
      chatId,
      `⚠️ ${user.first_name} hasn’t started a private chat with me yet! Please DM me first by clicking my name above and pressing *Start*, or you won’t receive your secret role.`
    );
  }

  // restart lobby timer on join
  if (game.phase === "lobby") {
    clearLobbyTimer(chatId);
    startLobbyTimer(chatId, bot);
  }

  // auto start
  if (game.players.length >= MIN_PLAYERS) {
    clearLobbyTimer(chatId);
    bot.sendMessage(chatId, "😺 Enough cats have gathered! Let the chaos begin...");
    startGame(chatId, bot);
  }
}

function newGame(chatId, bot) {
  if (games[chatId]) {
    bot.sendMessage(chatId, "😼 A game is already running here! Use /endgame to clear it first.");
    return;
  }

  games[chatId] = {
    phase: "lobby",
    players: [],
    createdAt: Date.now(),
  };

  bot.sendMessage(chatId, "🐾 A new *Chilled of Chills* game has begun! Type /join to nap or cause chaos.\n\n⏳ The lobby will close automatically if fewer than 3 cats join within 2 minutes.");
  clearLobbyTimer(chatId);
  startLobbyTimer(chatId, bot);
}

function startLobbyTimer(chatId, bot, duration = LOBBY_TIMEOUT) {
  lobbyDeadline[chatId] = Date.now() + duration;

  setTimeout(() => {
    const g = games[chatId];
    if (g && g.phase === "lobby" && g.players.length < MIN_PLAYERS) {
      bot.sendMessage(chatId, "⚠️ 1 minute left! Still need more cats to join the nap...");
    }
  }, Math.max(duration - 60000, 0));

  setTimeout(() => {
    const g = games[chatId];
    if (g && g.phase === "lobby" && g.players.length < MIN_PLAYERS) {
      bot.sendMessage(chatId, "⚠️ 30 seconds left before the lobby closes...");
    }
  }, Math.max(duration - 30000, 0));

  lobbyTimers[chatId] = setTimeout(() => {
    const g = games[chatId];
    if (g && g.phase === "lobby") {
      if (g.players.length < MIN_PLAYERS) {
        bot.sendMessage(chatId, `😿 Only ${g.players.length}/${MIN_PLAYERS} joined. The lobby has timed out — game cancelled. Try /newgame when more cats are awake!`);
        clearLobbyTimer(chatId);
        delete games[chatId];
      } else {
        bot.sendMessage(chatId, "😺 Enough cats have gathered just in time! Let the chaos begin...");
        startGame(chatId, bot);
      }
    }
  }, duration);
}

function getRemainingLobbyTime(chatId) {
  const now = Date.now();
  const deadline = lobbyDeadline[chatId];
  if (!deadline) return 0;
  const remaining = deadline - now;
  return remaining > 0 ? remaining : 0;
}

function extendLobby(chatId, bot, user) {
  const game = games[chatId];
  if (!game || game.phase !== "lobby") {
    bot.sendMessage(chatId, "😿 You can only extend time while the lobby is open!");
    return;
  }

  if (extendedLobbies[chatId]) {
    bot.sendMessage(chatId, "😹 The cats already got an extra nap! No more extensions.");
    return;
  }

  extendedLobbies[chatId] = true;

  const remaining = getRemainingLobbyTime(chatId);
  const newDuration = remaining + 60000;

  clearLobbyTimer(chatId);
  bot.sendMessage(chatId, `⏰ ${user.first_name} gave the cats an extra minute! Lobby extended by 60 seconds.`);
  startLobbyTimer(chatId, bot, newDuration);
}

function clearLobbyTimer(chatId) {
  if (lobbyTimers[chatId]) {
    clearTimeout(lobbyTimers[chatId]);
    delete lobbyTimers[chatId];
  }
  delete lobbyDeadline[chatId];
  delete extendedLobbies[chatId];
}

function startGame(chatId, bot) {
  const game = games[chatId];
  if (!game) return;
  clearLobbyTimer(chatId);

  if (game.players.length < MIN_PLAYERS) {
    bot.sendMessage(chatId, `😿 Only ${game.players.length}/${MIN_PLAYERS} joined — not enough cats for chaos. Lobby canceled.`);
    delete games[chatId];
    return;
  }

  bot.sendMessage(chatId, "🎮 Assigning roles... whiskers crossed!");
  assignRoles(game, bot);
  game.phase = "night";
  bot.sendMessage(chatId, "🌙 Night falls... cats whisper in the shadows.");
}

function endGame(chatId, bot, reason = "Game ended by admin.") {
  clearLobbyTimer(chatId);
  if (games[chatId]) delete games[chatId];
  bot.sendMessage(chatId, `💤 ${reason}`);
}

function assignRoles(game, bot) {
  const totalPlayers = game.players.length;
  const roles = [];

  roles.push(coreRoles.Chill);
  roles.push(coreRoles.Chaos);
  if (totalPlayers >= 3) roles.push(coreRoles.Seer);
  if (totalPlayers >= 4) roles.push(coreRoles.Doctor);

  const remaining = totalPlayers - roles.length;
  for (let i = 0; i < remaining; i++) {
    const meme = utils.randomChoice(Object.values(memeRoles));
    roles.push(meme);
  }

  utils.shuffle(roles);
  game.players.forEach((p, i) => {
    p.role = roles[i];
    try {
      bot.sendMessage(p.id, `😼 Your secret role: *${p.role.name}*\n\n${p.role.desc}`);
    } catch (err) {
      console.error("Failed to DM role to", p.name);
    }
  });
}

module.exports = { newGame, joinGame, startGame, endGame, extendLobby };
