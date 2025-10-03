// features/groupguard.js
const fs = require("fs");
const path = require("path");

// Load whitelist from /config/whitelist.json
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
  bot.on("my_chat_member", async (ctx) => {
    const chatId = ctx.chat.id.toString();
    const status = ctx.update.my_chat_member.new_chat_member.status;

    // Private chat check
    if (ctx.chat.type === "private") {
      if (!whitelist.users.includes(ctx.from.id)) {
        console.log(`❌ Unauthorized user tried: ${ctx.from.id}`);
        return ctx.reply("🚫 You are not authorized to use ChilledCatBot.");
      }
      return; // Private chat allowed
    }

    // Group / Supergroup check
    if (status === "member") {
      if (!whitelist.groups.map(String).includes(chatId)) {
        try {
          await ctx.reply("🚫 ChilledCatBot is private and can only be used in approved groups.");
          await ctx.leaveChat();
          console.log(`❌ Left unauthorized group: ${chatId}`);
        } catch (err) {
          console.error("Error leaving unauthorized group:", err);
        }
      } else {
        console.log(`✅ Joined approved group: ${chatId}`);
      }
    }
  });
}

module.exports = { setupGroupGuard };
