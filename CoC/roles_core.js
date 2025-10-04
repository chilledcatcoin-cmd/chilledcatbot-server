
// /CoC/roles_core.js
const { shuffle } = require("./utils");
const { memeRoles } = require("./roles_meme");

function assignRoles(game) {
  const ids = Object.keys(game.players);
  const shuffled = shuffle(ids);
  const roles = ["Chaos", "Chaos", "Seer", "Doctor"];
  roles.push(...memeRoles);
  while (roles.length < ids.length) roles.push("Chill");
  shuffled.forEach((id, i) => game.players[id].role = roles[i]);
}

function sendRoleDMs(bot, game) {
  for (const [id, player] of Object.entries(game.players)) {
    let msg = roleMessage(player.role);
    bot.telegram.sendMessage(id, msg).catch(() => {});
  }
}

function roleMessage(role) {
  switch (role) {
    case "Chaos": return "😼 Agent of Chaos. Use /sabotage @user at night.";
    case "Seer": return "🔮 Fortune Cat. Use /peek @user at night.";
    case "Doctor": return "🥛 Milkbringer. Use /protect @user at night.";
    case "TunaHoarder": return "🐟 Tuna Hoarder. If eliminated, you take someone with you!";
    case "NapMaster": return "😴 Nap Master. Once per game, use /nap in the day to skip voting.";
    case "Netcat": return "📡 Netcat. Use /block @user at night to cancel their action.";
    case "Fool": return "🎶 Karaoke Cat. You think you’re Seer, but your visions are wrong.";
    case "Jester": return "🛸 Roflcopter Cat. You only win if voted out!";
    default: return "😺 Chill Cat. Just vibe and vote smart.";
  }
}

module.exports = { assignRoles, sendRoleDMs };
