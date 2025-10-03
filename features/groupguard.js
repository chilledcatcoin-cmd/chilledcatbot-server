// features/groupguard.js
const fs = require("fs");
const path = require("path");

// Load whitelist JSON from /config
const whitelistPath = path.join(__dirname, "..", "config", "whitelist.json");
let whitelist = { groups: [], users: [] };

try {
  const raw = fs.readFileSync(whitelistPath, "utf8");
  whitelist = JSON.parse(raw);
  console.log("✅ Whitelist loaded:", whitelist);
} catch (err) {
  console.error("❌ Failed to load whitelist.json:", err);
}

function setupGroupGuard(bot) {
  const allowedGroups = whitelist.groups.map(String);
  const allowedUsers = whitelist.users.map(String);

  // Enforce whitelist on ALL messages/events
  bot.use(async (ctx, next) => {
    const chatId = ctx.chat?.id?.toString();
    const userId = ctx.from?.id?.toString();

    if (!chatId) return next();

    // Private chat check
    if (ctx.chat.type === "private") {
      if (!allowedUsers.includes(userId)) {
        console.log(`❌ Unauthorized user DM: ${userId}`);
        return ctx.reply("🚫 You are not authorized to use ChilledCatBot.");
      }
      return next();
    }

    // Group check
    if ((ctx.chat.type === "group" || ctx.chat.type === "supergroup") &&
        !allowedGroups.includes(chatId)) {
      try {
        await ctx.reply("🚫 This group is not whitelisted. ChilledCatBot will leave.");
        await ctx.leaveChat();
        console.log(`❌ Left unauthorized group: ${chatId}`);
      } catch (err) {
        console.error("Error leaving unauthorized group:", err);
      }
      return;
    }

    return next();
  });

  // Log membership status changes
  bot.on("my_chat_member", (ctx) => {
    const chatId = ctx.chat.id.toString();
    const status = ctx.update.my_chat_member.new_chat_member.status;
    console.log(`ℹ️ Membership change in ${chatId}: ${status}`);
  });
}

module.exports = { setupGroupGuard };
