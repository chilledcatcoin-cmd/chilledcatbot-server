// features/groupguard.js
const fs = require("fs");
const path = require("path");

// Path to whitelist file
const whitelistPath = path.join(__dirname, "..", "config", "whitelist.json");
let whitelist = { groups: [] };

// Load whitelist from file
function loadWhitelist() {
  try {
    const raw = fs.readFileSync(whitelistPath, "utf8");
    whitelist = JSON.parse(raw);
    console.log("✅ Group whitelist loaded:", whitelist.groups);
  } catch (err) {
    console.error("❌ Failed to load whitelist.json:", err);
  }
}

// Initial load
loadWhitelist();

function setupGroupGuard(bot) {
  bot.use(async (ctx, next) => {
    if (!ctx.chat) return next();

    const chatId = ctx.chat.id.toString();

    // Allow all private chats (DMs)
    if (ctx.chat.type === "private") return next();

    // Group / supergroup check
    if ((ctx.chat.type === "group" || ctx.chat.type === "supergroup") &&
        !whitelist.groups.map(String).includes(chatId)) {
      try {
        await ctx.reply("🚫 This group is not whitelisted. ChilledCatBot will leave.");
        await ctx.leaveChat();
        console.log(`❌ Left unauthorized group: ${chatId}`);
      } catch (err) {
        console.error("Error leaving unauthorized group:", err);
      }
      return; // stop processing
    }

    return next(); // continue normally
  });

function setupGroupGuard(bot) {
  bot.use(async (ctx, next) => {
    if (!ctx.chat) return next();

    const chatId = ctx.chat.id.toString();

    // Allow all private chats
    if (ctx.chat.type === "private") return next();

    // Group / supergroup check
    if ((ctx.chat.type === "group" || ctx.chat.type === "supergroup") &&
        !whitelist.groups.map(String).includes(chatId)) {
      try {
        await ctx.reply("🚫 This group is not whitelisted. ChilledCatBot will leave.");
        await ctx.leaveChat();
        console.log(`❌ Left unauthorized group: ${chatId}`);
      } catch (err) {
        console.error("Error leaving unauthorized group:", err);
      }
      return; // stop processing
    }

    return next();
  });

  // Log membership changes
  bot.on("my_chat_member", (ctx) => {
    const chatId = ctx.chat.id.toString();
    const status = ctx.update.my_chat_member.new_chat_member.status;
    console.log(`ℹ️ Membership change in ${chatId}: ${status}`);
  });

  // Command: /whereami (anyone can use in a group)
  bot.command("whereami", async (ctx) => {
    if (ctx.chat.type === "private") {
      return ctx.reply("👤 You are in a private chat. No group ID here.");
    }

    const chatId = ctx.chat.id.toString();
    const chatTitle = ctx.chat.title || "(no title)";

    await ctx.reply(
      `📍 Group Info\n\n` +
      `Title: ${chatTitle}\n` +
      `Chat ID: ${chatId}\n\n` +
      `ℹ️ Add this ID to whitelist.json if you want me to stay here.`
    );
  });


  // Owner-only command: /listgroups
  bot.command("listgroups", async (ctx) => {
    const ownerId = process.env.OWNER_ID;
    if (ctx.from.id.toString() !== ownerId) return; // ignore non-owners

    try {
      const me = await bot.telegram.getMe();
      const whitelistGroups = whitelist.groups.map(String);

      let msg = `🐾 ChilledCatBot Group Status\n\nWhitelisted Groups:\n`;
      msg += whitelistGroups.map(id => `- ${id}`).join("\n") || "(none)";

      msg += `\n\nℹ️ Note: Telegram bots cannot directly list all groups they're in.`;
      msg += `\nSo this only shows what’s in whitelist.json.`;

      await ctx.reply(msg);
    } catch (err) {
      console.error("Error in /listgroups:", err);
      await ctx.reply("❌ Could not fetch group list.");
    }
  });
}

module.exports = { setupGroupGuard, loadWhitelist };