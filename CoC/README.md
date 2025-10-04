# 🐾 Chilled Cat: Chill or Chaos
A Chilled Cat–flavored social deduction game for Telegram, inspired by Werewolf/Mafia.

## 🎮 How to Play
- /join to enter the lobby
- /startgame when 5+ players joined
- Bot assigns roles secretly (Chaos, Chill, Seer, Doctor, Meme Roles)
- Game alternates between night/day until win condition

## 📂 Folder Structure
- index.js - entry point
- game.js - game loop
- roles_core.js - core roles
- roles_meme.js - meme roles
- utils.js - helpers

## 🚀 Setup
In your main bot.js:
```js
const { setupChillOrChaos } = require("./CoC");
setupChillOrChaos(bot);
```
Restart bot, then play!

## 🐾 Commands
- /join, /leave, /startgame, /status, /roles
- /sabotage, /peek, /protect, /block (night actions)
- /vote, /nap (day actions)
- /endgame, /newgame (admin/host only)
