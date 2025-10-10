/**
 *
 *    _______   .---.  .---..-./`)   .---.     .---.       .-''-.   ______     
 *   /   __  \  |   |  |_ _|\ .-.')  | ,_|     | ,_|     .'_ _   \ |    _ `''. 
 *  | ,_/  \__) |   |  ( ' )/ `-' \,-./  )   ,-./  )    / ( ` )   '| _ | ) _  \
 *,-./  )       |   '-(_{;}_)`-'`"`\  '_ '`) \  '_ '`) . (_ o _)  ||( ''_'  ) |
 *\  '_ '`)     |      (_,_) .---.  > (_)  )  > (_)  ) |  (_,_)___|| . (_) `. |
 * > (_)  )  __ | _ _--.   | |   | (  .  .-' (  .  .-' '  \   .---.|(_    ._) '
 *(  .  .-'_/  )|( ' ) |   | |   |  `-'`-'|___`-'`-'|___\  `-'    /|  (_.\.' / 
 * `-'`-'     / (_{;}_)|   | |   |   |        \|        \\       / |       .'  
 *   `._____.'  '(_,_) '---' '---'   `--------``--------` `'-..-'  '-----'`    
 *                                                                           
 *                   +=*          ***	      _______      ____   ,---------. 			              
 *                  *:::*        *=.:*	     /   __  \   .'  __ `.\          \	             
 *                 *.::::+      *:.:::*     | ,_/  \__) /   '  \  \`--.  ,---'         
 *                 +....+*++**++::::::=*  ,-./  )       |___|  /  |   |   \       
 *               *+++=:.:::::.:..:.::::*  \  '_ '`)        _.-`   |   :_ _:            
 *                ++++=--=+=-+:=+++++++=+  > (_)  )  __ .'   _    |   (_I_)        
 *               *:+..##.:++::+++***=++*  (  .  .-'_/  )|  _( )_  |  (_(=)_)   
 *               *..*....-+:::++..#:..=+   `-'`-'     / \ (_ o _) /   (_I_)   
 *               *........+::.+.:++*+..*     `._____.'   '.(_,_).'    '---'
 *               *...*+:.:::::-....:...+           
 *               *....*....:=.....::...**:**=*     
 *               *.....+=...+...-:....-*::+=:+*-*  
 *                +....+**+**+****.:=+*+.=*:=*.:*  
 *              **+....=-:####%:+...*.+::::.*=:*   
 *           *:..=*++=..:+=:::=*....*...*::..:*    
 *         *+.:+......:+.......:+*-:=+.......*     
 *         *.=-........:=............:+:...:**     [ chilled cat warez ]       /\_/\         
 *        *:-=...=...*.++.............*::::*.*     nfo: vibes • meow • zzz    ( o.o )        
 *        *.*....*::.**:.............*-.:::+.*     rel: 1997 // TON forever    > ^ <         
 *        *:=....=**+:...........::..*.....+:*     
 *        **.....+*::=+::.::.....:*:**..:..+:*     
 *        **.....+:-+*:.:+::::**:-=::+.....+:*     
 *
 * =====================================================
 * ChilledCatBot - SafeCat Protector - protector.js - Manages whitelist, admin utilities, and group checks.
 * Version: 1.2.0
 * Date: 2025-10-08
 *
 * Changelog:
 * v1.2.0 - A fresh start
 * =====================================================
 */

const fs = require("fs");
const path = require("path");

const whitelistPath = path.join(__dirname, "./config/whitelist.json");
let whitelist = { groups: [], users: [] };

function loadWhitelist() {
  try {
    whitelist = JSON.parse(fs.readFileSync(whitelistPath, "utf8"));
    console.log("✅ SafeCat whitelist loaded.");
  } catch (err) {
    console.error("❌ Failed to load whitelist.json:", err.message);
  }
}

function isAdmin(ctx) {
  const userId = ctx.from.id.toString();
  const ownerId = (process.env.OWNER_ID || "").toString();
  return userId === ownerId || whitelist.users.map(String).includes(userId);
}

function setupProtector(bot) {
  loadWhitelist();

  // 🔒 Auto-leave unauthorized groups
  bot.use(async (ctx, next) => {
    if (!ctx.chat) return next();

    loadWhitelist();

    const chatId = ctx.chat.id.toString();

    if (ctx.chat.type === "private") return next();

    if ((ctx.chat.type === "group" || ctx.chat.type === "supergroup") &&
        !whitelist.groups.map(String).includes(chatId)) {
      try {
        await ctx.reply("🚫 This group is not whitelisted. Leaving now.");
        await ctx.leaveChat();
        console.log(`❌ Left unauthorized group: ${chatId}`);
      } catch (err) {
        console.error("SafeCat leave error:", err.message);
      }
      return;
    }

    return next();
  });

  // 👑 /listgroups
  bot.command("listgroups", async (ctx) => {
    if (!isAdmin(ctx)) return ctx.reply("🚫 Unauthorized.");
    const groups = whitelist.groups.map(String);
    let msg = `🐾 Whitelisted Groups:\n`;
    msg += groups.length ? groups.join("\n") : "(none)";
    await ctx.reply(msg);
  });

  // 📍 /whereami
  bot.command("whereami", async (ctx) => {
    if (ctx.chat.type === "private")
      return ctx.reply("👤 You are in a private chat.");
    await ctx.reply(`📍 Group: ${ctx.chat.title}\nID: ${ctx.chat.id}`);
  });

  // 👤 /whoami
  bot.command("whoami", async (ctx) => {
    const u = ctx.from;
    await ctx.reply(
      `👤 Your Info:\n🆔 ${u.id}\n📛 ${u.first_name}\n🔗 ${u.username ? "@" + u.username : "(none)"}`
    );
  });

bot.command("whois", async (ctx) => {
  if (!isAdmin(ctx)) return ctx.reply("🚫 Unauthorized.");

  const args = ctx.message.text.split(" ").slice(1);
  let target = null;

  // 🧱 Case 1: reply to a message
  if (ctx.message.reply_to_message) {
    target = ctx.message.reply_to_message.from.id;
  }
  // 🧱 Case 2: argument provided
  else if (args.length) {
    const input = args[0].trim();

    // Numeric ID (user or chat)
    if (/^-?\d+$/.test(input)) {
      target = parseInt(input);
    }
    // Username (user, group, or channel)
    else if (input.startsWith("@")) {
      try {
        const chat = await bot.telegram.getChat(input);
        target = chat.id;
      } catch (err) {
        console.error("❌ Username lookup failed:", err.message);
        return ctx.reply(`❌ Could not fetch info for ${input}`);
      }
    } else {
      return ctx.reply("❓ Usage: /whois <@username | id> or reply to a user");
    }
  } else {
    return ctx.reply("❓ Usage: /whois <@username | id> or reply to a user");
  }

  try {
    const chat = await bot.telegram.getChat(target);

    let info = `👤 Info:\n`;
    info += `🆔 <code>${chat.id}</code>\n`;
    info += `📛 ${chat.title || chat.first_name || "(no name)"}\n`;
    if (chat.username) info += `🔗 @${chat.username}\n`;
    info += `👥 Type: ${chat.type}`;

    // Optional extras
    if (chat.bio) info += `\n💬 Bio: ${chat.bio}`;
    if (chat.description) info += `\n📝 Description: ${chat.description}`;
    if (chat.members_count) info += `\n👥 Members: ${chat.members_count}`;

    await ctx.replyWithHTML(info);
  } catch (err) {
    console.error("❌ WHOIS error:", err.message);
    await ctx.reply(`❌ Could not fetch info for ${target}`);
  }
});

  console.log("🛡️ SafeCat Protector active.");
}

function isWhitelisted(userId) {
  loadWhitelist();
  return (
    whitelist.users.map(String).includes(userId.toString()) ||
    whitelist.groups.map(String).includes(userId.toString())
  );
}

async function canAccess(userId) {
  if (!userId) return false;

  const ownerId = (process.env.OWNER_ID || "").toString();
  loadWhitelist();

  return (
    userId.toString() === ownerId ||
    whitelist.users.map(String).includes(userId.toString())
  );
}

module.exports = {
  setupProtector,
  isWhitelisted,
  canAccess,
};
