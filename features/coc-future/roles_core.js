// 🐾 Chilled Cat: Chill or Chaos — Core Roles
// Defines the main roles and their abilities

module.exports = {
  Chill: {
    name: "Chill Cat",
    alignment: "Chill",
    nightAction: false,
    command: null,
    prompt: null,
    desc: "😺 You’re a regular Chilled Cat. Take naps, vibe, and survive. Win if Chaos Cats are eliminated.",
    resolve: (game, actor, target, bot) => {
      // Chill cats just vibe — no night action.
    }
  },

  Chaos: {
    name: "Chaos Cat",
    alignment: "Chaos",
    nightAction: true,
    command: "/target",
    prompt: "Choose a cat to sabotage tonight. Use /target @username in DM.",
    desc: "😼 You are the Chaos Cat. Each night, you may sabotage (eliminate) one cat. Win if Chaos outnumbers Chill.",
    resolve: (game, actor, target, bot) => {
      if (!target || !target.alive) return;
      bot.sendMessage(actor.id, `😈 You chose to sabotage ${target.name} tonight.`);
      game.pendingKills.push(target.id);
    }
  },

  Seer: {
    name: "Seer Cat",
    alignment: "Chill",
    nightAction: true,
    command: "/peek",
    prompt: "Use /peek @username in DM to discover if they are Chill or Chaos.",
    desc: "🔮 You are Seer Cat. Each night, peek at one cat to sense their vibe — Chill or Chaos?",
    resolve: (game, actor, target, bot) => {
      if (!target) return;
      const alignment = target.role?.alignment || "Unknown";
      bot.sendMessage(actor.id, `🔮 You peeked at ${target.name}. They seem to be *${alignment}*.`);
    }
  },

  Doctor: {
    name: "Doctor Cat",
    alignment: "Chill",
    nightAction: true,
    command: "/protect",
    prompt: "Use /protect @username in DM to keep them safe tonight.",
    desc: "💊 You are Doctor Cat. Each night, protect one cat from Chaos.",
    resolve: (game, actor, target, bot) => {
      if (!target || !target.alive) return;
      game.protected = target.id;
      bot.sendMessage(actor.id, `💉 You decided to protect ${target.name} tonight.`);
    }
  }
};
