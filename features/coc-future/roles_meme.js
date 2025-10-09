// 🐾 Chilled Cat: Chill or Chaos — Meme Roles
// Adds weird, chaotic, and meme-flavored cats with light abilities.

module.exports = {
  PizzaCat: {
    name: "Pizza Cat",
    alignment: "Chill",
    nightAction: true,
    command: "/deliver",
    prompt: "Use /deliver @username in DM to send them a mysterious late-night pizza.",
    desc: "🍕 Pizza Cat delivers pizzas that may or may not be cursed. Blocks one player’s vote the next day.",
    resolve: (game, actor, target, bot) => {
      if (!target || !target.alive) return;
      target.voteBlocked = true;
      bot.sendMessage(actor.id, `🍕 You delivered a pizza to ${target.name}. They’ll be too full to vote tomorrow.`);
    }
  },

  FishLord: {
    name: "Fish Lord",
    alignment: "Neutral",
    nightAction: true,
    command: "/convert",
    prompt: "Use /convert @username to attempt to bring them into the Fish Cult.",
    desc: "🐟 You are the Fish Lord. Spread the Fish Cult. Convert one random cat each night.",
    resolve: (game, actor, target, bot) => {
      if (!target || !target.alive) return;
      target.role.alignment = "Fish Cult";
      bot.sendMessage(actor.id, `🐟 You have converted ${target.name} into a loyal Fish Cultist.`);
      bot.sendMessage(target.id, `🐟 You had a strange dream... You are now part of the *Fish Cult*.`);
    }
  },

  CryptoCat: {
    name: "Crypto Cat",
    alignment: "Chaos",
    nightAction: true,
    command: "/rugpull",
    prompt: "Use /rugpull @username in DM to attempt a high-risk, high-reward move.",
    desc: "💻 Crypto Cat can rug-pull once per game — eliminates a random player (including possibly itself).",
    used: false,
    resolve: (game, actor, target, bot) => {
      if (module.exports.CryptoCat.used) {
        bot.sendMessage(actor.id, "💰 You’ve already rug-pulled once. No more crypto chaos tonight.");
        return;
      }
      module.exports.CryptoCat.used = true;
      const allAlive = game.players.filter(p => p.alive);
      const victim = target || allAlive[Math.floor(Math.random() * allAlive.length)];
      if (!victim) return;
      game.pendingKills.push(victim.id);
      bot.sendMessage(actor.id, `💣 You rug-pulled ${victim.name}! The market crashes...`);
      if (victim.id === actor.id) bot.sendMessage(actor.id, "😹 Oops! You rugged yourself. Classic.");
    }
  },

  LOLCat: {
    name: "LOL Cat",
    alignment: "Neutral",
    nightAction: true,
    command: "/lol",
    prompt: "You may simply send /lol to giggle into the night. Pure chaos.",
    desc: "😹 LOL Cat does nothing productive. Just memes. May cause confusion or random emotes in chat.",
    resolve: (game, actor, target, bot) => {
      const memes = [
        "When the yarn hits different 🧶",
        "This nap? Legendary. 😴",
        "Chaos? I hardly know her! 😂",
        "Fish are temporary, naps are forever. 🐟💤"
      ];
      const msg = memes[Math.floor(Math.random() * memes.length)];
      bot.sendMessage(actor.id, `😹 You giggle to yourself: “${msg}”`);
    }
  },

  CatGPT: {
    name: "CatGPT",
    alignment: "Chill",
    nightAction: false,
    command: null,
    prompt: null,
    desc: "🤖 CatGPT makes bold predictions about the next day.",
    resolve: (game, actor, target, bot) => {
      const predictions = [
        "Tomorrow someone will oversleep and get voted out. 💤",
        "Fish Cult uprising imminent. 🐟",
        "A pizza will be delivered to the wrong cat. 🍕",
        "The Chaos Cat will sneeze during stealth mode. 😹",
        "Doctor Cat forgot the stethoscope again. 💊"
      ];
      const msg = predictions[Math.floor(Math.random() * predictions.length)];
      bot.sendMessage(actor.id, `🤖 *CatGPT Prediction:* ${msg}`);
    }
  }
};
