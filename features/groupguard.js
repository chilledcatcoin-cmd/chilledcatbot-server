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
 * ChilledCatBot - Group Guard - groupdguard.js - Ensures the bot only stays in whitelisted groups
 * Version: 1.0.0
 * Date: 2025-10-03
 *
 * Changelog:
 * v1.0.0 - Created.
 *
 *  Commands:
 *    /listgroups  -> Show whitelisted groups (admin only)
 *    /whereami    -> Show current group ID
 *    /whoami      -> Show your Telegram user ID
 *    /whois <id>  -> Lookup info by Telegram ID (admin only)
 *
 *  Usage:
 *    Add group IDs and admin user IDs to /config/whitelist.json
 *    Restart bot (or reload) to apply changes.
 *
 * ChilledCatBot - Whitelist Config - whitelist.json - Group/User whitelist (Where JSON very strict, cannot add comments, need for my own memory)
 * Version: 1.0.0
 * Date: 2025-10-03
 *
 * Changelog:
 * v1.0.0 - Created.
 *
 *  groups: List of Telegram group/supergroup IDs the bot is
 *          allowed to stay in. All others will be left.
 *
 *  users:  List of Telegram user IDs who are authorized to run
 *          admin-only commands (besides OWNER_ID from .env).
 *
 *  NOTE: You can get IDs by using:
 *        - /whereami (group ID)
 *        - /whoami (your own ID)
 *        - /whois <id> (lookup someone else)
 * =====================================================
 */

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
  // 🔒 Middleware: restrict groups
  bot.use(async (ctx, next) => {
    if (!ctx.chat) return next();
    const chatId = ctx.chat.id.toString();

    // Allow private chats
    if (ctx.chat.type === "private") return next();

    // Groups: check whitelist
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

    return next();
  });

  // 👑 Admin command: /listgroups
  bot.command("listgroups", async (ctx) => {
    const ownerId = process.env.OWNER_ID;
    const userId = ctx.from.id.toString();

    if (userId !== ownerId && !whitelist.users.map(String).includes(userId)) {
      return ctx.reply("🚫 You are not authorized to use this command.");
    }

    const whitelistGroups = whitelist.groups.map(String);
    let msg = `🐾 Whitelisted Groups:\n`;
    msg += whitelistGroups.length ? whitelistGroups.join("\n") : "(none)";
    await ctx.reply(msg);
  });

  // Utility: /whereami
  bot.command("whereami", async (ctx) => {
    if (ctx.chat.type === "private") {
      return ctx.reply("👤 You are in a private chat. No group ID here.");
    }
    await ctx.reply(`📍 Group: ${ctx.chat.title}\nID: ${ctx.chat.id}`);
  });

  // Utility: /whoami
  bot.command("whoami", async (ctx) => {
    const userId = ctx.from.id.toString();
    const username = ctx.from.username ? `@${ctx.from.username}` : "(no username)";
    const firstName = ctx.from.first_name || "";
    await ctx.reply(`👤 Your Info:\n\n🆔 ID: ${userId}\n📛 Name: ${firstName}\n🔗 Username: ${username}`);
  });

  // 👑 Admin: /whois <id>
  bot.command("whois", async (ctx) => {
    const ownerId = process.env.OWNER_ID;
    const userId = ctx.from.id.toString();
    if (userId !== ownerId && !whitelist.users.map(String).includes(userId)) {
      return ctx.reply("🚫 You are not authorized to use this command.");
    }

    const args = ctx.message.text.split(" ").slice(1);
    if (args.length < 1) return ctx.reply("❓ Usage: /whois <user_id>");

    const targetId = args[0].trim();
    try {
      const chat = await bot.telegram.getChat(targetId);
      await ctx.reply(
        `👤 User Info:\n\n🆔 ID: ${chat.id}\n📛 Name: ${chat.first_name || ""} ${chat.last_name || ""}\n🔗 Username: ${chat.username || "(none)"}\n👥 Type: ${chat.type}`
      );
    } catch (err) {
      console.error("Error in /whois:", err);
      await ctx.reply(`❌ Could not fetch info for ID ${targetId}`);
    }
  });
}

module.exports = { setupGroupGuard, loadWhitelist };
