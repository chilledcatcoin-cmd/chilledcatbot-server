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
 *                   +=*          ***	    _______      ____   ,---------. 			              
 *                  *:::*        *=.:*	   /   __  \   .'  __ `.\          \	             
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

const whitelistPath = path.join(__dirname, "../../config/whitelist.json");
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

  // 👑 /whois
  bot.command("whois", async (ctx) => {
    if (!isAdmin(ctx)) return ctx.reply("🚫 Unauthorized.");

    let target = null;
    if (ctx.message.reply_to_message)
      target = ctx.message.reply_to_message.from.id.toString();
    else {
      const args = ctx.message.text.split(" ").slice(1);
      if (!args.length)
        return ctx.reply("❓ Usage: reply to a message with /whois OR /whois <id | @username>");
      target = args[0].trim();
    }

    try {
      const chat = await bot.telegram.getChat(target);
      await ctx.reply(
        `👤 User Info:\n🆔 ${chat.id}\n📛 ${chat.first_name || ""} ${chat.last_name || ""}\n🔗 ${
          chat.username ? "@" + chat.username : "(none)"
        }\n👥 Type: ${chat.type}`
      );
    } catch {
      await ctx.reply(`❌ Could not fetch info for ${target}`);
    }
  });

  console.log("🛡️ SafeCat Protector active.");
}

module.exports = { setupProtector };
