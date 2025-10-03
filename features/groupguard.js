// features/groupguard.js
const fs = require("fs");
const path = require("path");

const whitelistPath = path.join(__dirname, "..", "config", "whitelist.json");
let whitelist = { groups: [], users: [] };

function loadWhitelist() {
  try {
    const raw = fs.readFileSync(whitelistPath, "utf8");
    whitelist = JSON.parse(raw);
    console.log("✅ Whitelist loaded:", whitelist);
  } catch (err) {
    console.error("❌ Failed to load whitelist.json:", err);
  }
}

// Load at startup
loadWhitelist();

function setupGroupGuard(bot) {
  bot.use(async (ctx, next) => {
    if (!ctx.chat) return next(); // ignore weird updates

    const chatId = ctx.chat.id.toString();
    const userId = ctx.from?.id?.toString();

    // 🔒 PRIVATE CHAT CHECK
    if (ctx.chat.type === "private") {
      if (!whitelist.users.map(String).includes(userId)) {
        console.log(`❌ Unauthorized DM from ${userId}`);
        try {
          await ctx.reply("🚫 You are not authorized to use ChilledCatBot.");
        } catch (err) {
          console.error("Error replying to unauthorized DM:", err);
        }
        return; // ❌ block here (don’t call next)
      }
      return next(); // ✅ allow whitelisted user
    }

    // 🔒 GROUP / SUPERGROUP CHECK
    if ((ctx.chat.type === "group" || ctx.chat.type === "supergroup") &&
        !whitelist.groups.map(String).includes(chatId)) {
      try {
        await ctx.reply("🚫 This group is not whitelisted. Leaving now.");
        await ctx.leaveChat();
        console.log(`❌ Left unauthorized group: ${chatId}`);
      } catch (err) {
        console.error("Error leaving unauthorized group:", err);
      }
      return;
    }

    return next(); // ✅ allow normal flow
  });
}

module.exports = { setupGroupGuard, loadWhitelist };
