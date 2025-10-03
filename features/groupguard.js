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
    console.error("❌ Failed to load whitelist.json:", err.message);
  }
}

loadWhitelist();

function setupGroupGuard(bot) {
  bot.use(async (ctx, next) => {
    if (!ctx.chat) return next();

    const chatId = ctx.chat.id.toString();

    // ✅ Allow ALL private chats (no whitelist check here)
    if (ctx.chat.type === "private") {
      return next();
    }

    // 🔒 Restrict groups to whitelist
    if ((ctx.chat.type === "group" || ctx.chat.type === "supergroup") &&
        !whitelist.groups.map(String).includes(chatId)) {
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

  // Admin-only command: /listgroups
  bot.command("listgroups", async (ctx) => {
    const ownerId = process.env.OWNER_ID;
    const userId = ctx.from.id.toString();

    if (userId !== ownerId && !whitelist.users.map(String).includes(userId)) {
      return ctx.reply("🚫 You are not authorized to run this command.");
    }

    const whitelistGroups = whitelist.groups.map(String);
    let msg = `🐾 ChilledCatBot Group Status\n\nWhitelisted Groups:\n`;
    msg += whitelistGroups.length
      ? whitelistGroups.map(id => `- ${id}`).join("\n")
      : "(none)";

    msg += `\n\nℹ️ Note: Bots cannot directly list all joined groups — this shows the whitelist.json.`;

    await ctx.reply(msg);
  });

  // Utility command: /whereami (anyone in a group)
  bot.command("whereami", async (ctx) => {
    if (ctx.chat.type === "private") {
      return ctx.reply("👤 You are in a private chat. No group ID here.");
    }
    const chatId = ctx.chat.id.toString();
    const chatTitle = ctx.chat.title || "(no title)";
    await ctx.reply(`📍 Group Info\n\nTitle: ${chatTitle}\nChat ID: ${chatId}`);
  });
}

module.exports = { setupGroupGuard, loadWhitelist };
