// 🐾 Chilled Cat: Chill or Chaos — Game Controller
// Manages lobby, roles, and transitions between phases

const utils = require("./utils");
const coreRoles = require("./roles_core");
const memeRoles = require("./roles_meme");
const night = require("./night");
const day = require("./day");

const games = {}; // active game states per chat
let lobbyTimers = {};
let lobbyDeadline = {};
let extendedLobbies = {};

const MIN_PLAYERS = 3;
const LOBBY_TIMEOUT = 120000;

function formatTime(ms) {
  const seconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return minutes > 0 ? `${minutes}m ${sec.toString().padStart(2, "0")}s` : `${sec}s`;
}

// ===== JOIN =====
async function joinGame(chatId, user, bot) {
  const game = games[chatId];
  if (!game || game.phase !== "lobby") return;

  const alreadyJoined = game.players.find(p => p.id === user.id);
  if (alreadyJoined) {
    bot.sendMessage(chatId, `${user.first_name} is already in the lobby!`);
    return;
  }

  game.players.push({ id: user.id, name: user.first_name, username: user.username || "", alive: true });
  bot.sendMessage(chatId, `🐱 ${user.first_name} has joined the nap party! (${game.players.length} cats now.)`);

  // DM the player
  try {
    await bot.sendMessage(
      user.id,
      `😺 Welcome to *Chilled of Chills*, ${user.first_name}!\n\n` +
      `You’ve joined the game in \"${game.chatTitle || 'this group'}\".\n` +
      `Keep this chat open — your secret role and night actions will appear here soon. 🕵️‍♂️\n\n` +
      `If you don’t see future messages, press *Start* in this private chat!`
    );
  } catch (err) {
    bot.sendMessage(
      chatId,
      `⚠️ ${user.first_name} hasn’t started a private chat with me yet! They must press *Start* in DM to play properly.`
    );
  }

  if (game.phase === "lobby") {
    clearLobbyTimer(chatId);
    startLobbyTimer(chatId, bot);
  }

  if (game.players.length >= MIN_PLAYERS) {
    clearLobbyTimer(chatId);
    bot.sendMessage(chatId, "😺 Enough cats have gathered! Let the chaos begin...");
    startGame(chatId, bot);
  }
}

// ===== NEW GAME =====
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

  bot.sendMessage(
    chatId,
    "🐾 A new *Chilled of Chills* game has begun! Type /join to nap or cause chaos.\n\n" +
    "⏳ The lobby will close automatically if fewer than 3 cats join within 2 minutes."
  );
  clearLobbyTimer(chatId);
  startLobbyTimer(chatId, bot);
}

// ===== LOBBY TIMER =====
function startLobbyTimer(chatId, bot, duration = LOBBY_TIMEOUT) {
  lobbyDeadline[chatId] = Date.now() + duration;

  lobbyTimers[chatId] = setTimeout(() => {
    const g = games[chatId];
    if (g && g.phase === "lobby") {
      if (g.players.length < MIN_PLAYERS) {
        bot.sendMessage(chatId, `😿 Only ${g.players.length}/${MIN_PLAYERS} joined. Lobby closed. Try /newgame when more cats are awake!`);
        clearLobbyTimer(chatId);
        delete games[chatId];
      } else {
        bot.sendMessage(chatId, "😺 Enough cats joined just in time! Starting the chaos...");
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

// ===== EXTEND LOBBY =====
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
  startLobbyTimer(chatId, bot, newDuration);
  bot.sendMessage(chatId, `⏰ ${user.first_name} gave the cats an extra minute! Lobby now closes in about ${formatTime(newDuration)}.`);
}

function clearLobbyTimer(chatId) {
  if (lobbyTimers[chatId]) {
    clearTimeout(lobbyTimers[chatId]);
    delete lobbyTimers[chatId];
  }
  delete lobbyDeadline[chatId];
  delete extendedLobbies[chatId];
}

// ===== START GAME =====
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
  bot.sendMessage(chatId, "🌙 Night falls... cats whisper in the shadows.");
  game.phase = "night";

  night.startNightPhase(chatId, bot, game);
}

// ===== END GAME =====
function endGame(chatId, bot, reason = "Game ended by admin.") {
  clearLobbyTimer(chatId);
  if (games[chatId]) delete games[chatId];
  bot.sendMessage(chatId, `💤 ${reason}`);
}

// ===== ASSIGN ROLES =====
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
    p.alive = true;
    try {
      bot.sendMessage(p.id, `😼 Your secret role: *${p.role.name}*\n\n${p.role.desc}`);
    } catch (err) {
      console.error("Failed to DM role to", p.name);
    }
  });
}

// ===== STATUS COMMAND =====
function getStatus(chatId, bot) {
  const game = games[chatId];
  if (!game) {
    bot.sendMessage(chatId, "😴 No active game in this chat. Use /newgame to start one!");
    return;
  }

  let message = `🐾 *Chilled Cat Status*\n`;
  message += `Phase: ${game.phase === "lobby" ? "💬 Lobby" : game.phase === "night" ? "🌙 Night" : "☀️ Day"}\n`;
  message += `Players: ${game.players.filter(p => p.alive).length}/${game.players.length} alive\n`;

  if (game.phase === "lobby") {
    const remain = getRemainingLobbyTime(chatId);
    message += `Time left to start: ${formatTime(remain)}\n`;
  }

  bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
}

module.exports = {
  newGame,
  joinGame,
  startGame,
  endGame,
  extendLobby,
  getStatus,
  games
};
