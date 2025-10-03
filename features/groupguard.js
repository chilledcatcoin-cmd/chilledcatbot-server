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

  // Utility command: /whoami (anyone can use in DM or groups)
  bot.command("whoami", async (ctx) => {
    const userId = ctx.from?.id?.toString();
    const username = ctx.from?.username ? `@${ctx.from.username}` : "(no username)";
    const firstName = ctx.from?.first_name || "";

    let msg = `👤 Your Info:\n\n`;
    msg += `🆔 ID: ${userId}\n`;
    msg += `📛 Name: ${firstName}\n`;
    msg += `🔗 Username: ${username}`;

    await ctx.reply(msg);
  });

  // Admin-only command: /whois <id>
  bot.command("whois", async (ctx) => {
    const ownerId = process.env.OWNER_ID;
    const userId = ctx.from.id.toString();

    // Only OWNER or whitelisted admin users can use this
    if (userId !== ownerId && !whitelist.users.map(String).includes(userId)) {
      return ctx.reply("🚫 You are not authorized to use this command.");
    }

    const args = ctx.message.text.split(" ").slice(1);
    if (args.length < 1) {
      return ctx.reply("❓ Usage: /whois <user_id>");
    }

    const targetId = args[0].trim();

    try {
      const user = await bot.telegram.getChat(targetId);
      const username = user.username ? `@${user.username}` : "(no username)";
      const firstName = user.first_name || "";
      const lastName = user.last_name || "";

      let msg = `👤 User Info:\n\n`;
      msg += `🆔 ID: ${user.id}\n`;
      msg += `📛 Name: ${firstName} ${lastName}\n`;
      msg += `🔗 Username: ${username}\n`;
      msg += `👥 Type: ${user.type || "user"}`;

      await ctx.reply(msg);
    } catch (err) {
      console.error("Error in /whois:", err);
      await ctx.reply(`❌ Could not fetch info for ID ${targetId}`);
    }
  });



module.exports = { setupGroupGuard, loadWhitelist };
