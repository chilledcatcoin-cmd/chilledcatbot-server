
// /CoC/utils.js
function shuffle(arr) {
  let a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function roleEmoji(role) {
  switch (role) {
    case "Chaos": return "😼";
    case "Chill": return "😺";
    case "Seer": return "🔮";
    case "Doctor": return "🥛";
    case "TunaHoarder": return "🐟";
    case "NapMaster": return "😴";
    case "Netcat": return "📡";
    case "Fool": return "🎶";
    case "Jester": return "🛸";
    default: return "🐾";
  }
}

function revealRoles(bot, game) {
  let summary = "📜 Final Role Reveal:\n\n";
  for (const player of Object.values(game.players)) {
    const status = player.alive ? "✅ Alive" : "☠️ Out";
    summary += `• @${player.username} → ${roleEmoji(player.role)} ${player.role} (${status})\n`;
  }
  bot.telegram.sendMessage(game.chatId, summary);
}

function parseTarget(ctx, game) {
  if (!ctx.message.text) return null;
  const parts = ctx.message.text.split(" ");
  if (parts.length < 2) return null;
  const username = parts[1].replace("@", "");
  const entry = Object.entries(game.players).find(([id, p]) => p.username === username && p.alive);
  return entry ? entry[0] : null;
}

function findGameByPlayer(userId) {
  return Object.values(global.games || {}).find(g => g.players[userId]);
}

module.exports = { shuffle, roleEmoji, revealRoles, parseTarget, findGameByPlayer };
