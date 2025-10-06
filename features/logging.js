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
 * ChilledCatBot - Bot Logging - logging.js - Error logs and channel logs.
 * Version: 1.0.0
 * Date: 2025-10-03
 *
 * Changelog:
 * v1.0.0 - Created, message logs, join/leaves logs, error logs and admin commands.
 *
 *  /logstatus → show current logging settings and groups
 *  /logon <messages|joins|errors|admin> → turn a logging type ON
 *  /logoff <messages|joins|errors|admin> → turn a logging type OFF
 *  /loggroupadd <group_id> → add a group to the logging whitelist
 *  /loggroupremove <group_id> → remove a group from the logging whitelist
 * =====================================================
 */


const fs = require("fs");
const path = require("path");

const logConfigPath = path.join(__dirname, "..", "config", "logging.json");
let logFlags = { messages: true, joins: true, errors: true, admin: true, groups: [] };

function loadLogFlags() {
  try {
    const raw = fs.readFileSync(logConfigPath, "utf8");
    logFlags = JSON.parse(raw);
    console.log("✅ Logging flags loaded:", logFlags);
  } catch (err) {
    console.error("❌ Failed to load logging.json:", err.message);
  }
}

function saveLogFlags() {
  fs.writeFileSync(logConfigPath, JSON.stringify(logFlags, null, 2));
  console.log("💾 Logging flags saved:", logFlags);
}

function shouldLogChat(chatId) {
  if (!chatId) return false;
  if (logFlags.groups.length === 0) return true; // default: log all groups if none specified
  return logFlags.groups.map(String).includes(chatId.toString());
}

function setupLogging(bot) {
  loadLogFlags();

  const logChatId = process.env.LOG_CHAT_ID;
  if (!logChatId) {
    console.warn("⚠️ Logging disabled: LOG_CHAT_ID not set");
    return;
  }

  // Helper
  function log(msg) {
    console.log("LOG:", msg);
    bot.telegram.sendMessage(logChatId, msg).catch(() => {});
  }

  // Log messages
  bot.on("message", (ctx, next) => {
    if (logFlags.messages && shouldLogChat(ctx.chat?.id)) {
      const user = ctx.from?.username ? `@${ctx.from.username}` : ctx.from?.id;
      const chat = ctx.chat?.title || ctx.chat?.id;
      const text = ctx.message?.text || "[non-text]";
      log(`💬 ${user} in ${chat}: ${text}`);
    }
    return next();
  });

  // Log joins/leaves
  bot.on("chat_member", (ctx) => {
    if (logFlags.joins && shouldLogChat(ctx.chat?.id)) {
      const member = ctx.chat_member?.new_chat_member?.user;
      if (member) {
        log(`🚪 ${member.username ? "@" + member.username : member.id} in ${ctx.chat.title}`);
      }
    }
    return next();
  });

// Log callback queries (buttons) and pass through
bot.on("callback_query", (ctx, next) => {
  if (logFlags.messages && shouldLogChat(ctx.chat?.id)) {
    const user = ctx.from?.username ? `@${ctx.from.username}` : ctx.from?.id;
    const data = ctx.callbackQuery?.data || "[no data]";
    const chat = ctx.chat?.title || ctx.chat?.id;
    log(`🔘 ${user} pressed button "${data}" in ${chat}`);
  }
  return next(); // <-- CRITICAL: allows other modules (like Trivia) to see it
});

  // Error handler
  bot.catch((err, ctx) => {
    if (logFlags.errors && shouldLogChat(ctx.chat?.id)) {
      log(`⚠️ ERROR\nChat: ${ctx?.chat?.title || ctx?.chat?.id}\nError: ${err.message}`);
    }
  });

  // Admin-only logging control
  bot.command(["logon", "logoff"], async (ctx) => {
    const userId = ctx.from.id.toString();
    const ownerId = (process.env.OWNER_ID || "").toString();
    if (userId !== ownerId) {
  return ctx.reply("🚫 You are not authorized to use this command.");
}

    const parts = ctx.message.text.split(" ");
    if (parts.length < 2) {
      return ctx.reply("❓ Usage: /logon <messages|joins|errors|admin> or /logoff <...>");
    }

    const target = parts[1].toLowerCase();
    if (!(target in logFlags)) {
      return ctx.reply("❌ Unknown log type. Options: messages, joins, errors, admin");
    }

    const enable = ctx.message.text.startsWith("/logon");
    logFlags[target] = enable;
    saveLogFlags();

    await ctx.reply(`✅ Logging for ${target} is now ${enable ? "ON" : "OFF"}`);
  });

  // Admin-only: manage log groups
  bot.command(["loggroupadd", "loggroupremove"], async (ctx) => {
    const userId = ctx.from.id.toString();
    const ownerId = (process.env.OWNER_ID || "").toString();
    if (userId !== ownerId) return ctx.reply("🚫 Unauthorized");

    const parts = ctx.message.text.split(" ");
    if (parts.length < 2) {
      return ctx.reply("❓ Usage: /loggroupadd <group_id> or /loggroupremove <group_id>");
    }

    const targetId = parts[1].trim();
    if (ctx.message.text.startsWith("/loggroupadd")) {
      if (!logFlags.groups.map(String).includes(targetId)) {
        logFlags.groups.push(Number(targetId));
        saveLogFlags();
      }
      return ctx.reply(`✅ Group ${targetId} added to logging.`);
    } else {
      logFlags.groups = logFlags.groups.filter(id => id.toString() !== targetId);
      saveLogFlags();
      return ctx.reply(`❌ Group ${targetId} removed from logging.`);
    }
  });

  bot.command("logstatus", async (ctx) => {
    const userId = ctx.from.id.toString();
    const ownerId = (process.env.OWNER_ID || "").toString();
    if (userId !== ownerId) return ctx.reply("🚫 Unauthorized");

    let msg = "📜 Logging Status:\n\n";
    for (const [k, v] of Object.entries(logFlags)) {
      if (k === "groups") continue;
      msg += `${v ? "✅" : "❌"} ${k}\n`;
    }
    msg += "\n📍 Groups:\n";
    msg += logFlags.groups.length ? logFlags.groups.join("\n") : "(all groups)";
    await ctx.reply(msg);
  });
}

module.exports = { setupLogging };