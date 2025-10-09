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
 * ChilledCatBot - SafeCat Logger - logger.js - Handles: message logs, join/leave logs, error logs,
 * and admin logging controls.
 * Version: 1.2.0
 * Date: 2025-10-08
 *
 * Changelog:
 * v1.2.0 - A fresh start
 * =====================================================
 */

const fs = require("fs");
const path = require("path");

const configPath = path.join(__dirname, "./config/logging.json");
let logFlags = { messages: true, joins: true, errors: true, admin: true, groups: [] };

function loadConfig() {
  try {
    const data = fs.readFileSync(configPath, "utf8");
    logFlags = JSON.parse(data);
    console.log("✅ SafeCat logging config loaded.");
  } catch (err) {
    console.error("❌ Failed to load logging.json:", err.message);
  }
}

function saveConfig() {
  fs.writeFileSync(configPath, JSON.stringify(logFlags, null, 2));
}

function shouldLog(chatId) {
  if (!chatId) return false;
  if (logFlags.groups.length === 0) return true;
  return logFlags.groups.map(String).includes(chatId.toString());
}

function setupLogger(bot) {
  loadConfig();
  const logChatId = process.env.LOG_CHAT_ID;
  if (!logChatId) console.warn("⚠️ SafeCat: LOG_CHAT_ID not set — console-only logs.");

  // 🛡️ Global safety wrapper — always first
  bot.use(async (ctx, next) => {
    try {
      await next();
    } catch (err) {
      console.error("🔥 Unhandled error:", err);
      if (process.env.LOG_CHAT_ID) {
        try {
          await bot.telegram.sendMessage(
            process.env.LOG_CHAT_ID,
            `🔥 Unhandled error:\n${err.message}`
          );
        } catch {}
      }
    }
  });


  function log(msg) {
    console.log("🪶", msg);
    if (logChatId) bot.telegram.sendMessage(logChatId, msg).catch(() => {});
  }

  // 📩 Message logs
  bot.on("message", (ctx, next) => {
    if (logFlags.messages && shouldLog(ctx.chat?.id)) {
      const user = ctx.from?.username ? `@${ctx.from.username}` : ctx.from?.first_name;
      const chat = ctx.chat?.title || ctx.chat?.id;
      const text = ctx.message?.text || "[non-text]";
      log(`💬 ${user} in ${chat}: ${text}`);
    }
    return next();
  });

  // 👋 Join / leave
  bot.on("chat_member", (ctx) => {
    if (logFlags.joins && shouldLog(ctx.chat?.id)) {
      const member = ctx.chat_member?.new_chat_member?.user;
      if (member)
        log(`🚪 ${member.username ? "@" + member.username : member.id} in ${ctx.chat.title}`);
    }
  });

  // 🔘 Buttons
  bot.on("callback_query", (ctx, next) => {
    if (logFlags.messages && shouldLog(ctx.chat?.id)) {
      const user = ctx.from?.username ? `@${ctx.from.username}` : ctx.from?.id;
      const data = ctx.callbackQuery?.data || "[no data]";
      const chat = ctx.chat?.title || ctx.chat?.id;
      log(`🔘 ${user} pressed "${data}" in ${chat}`);
    }
    return next();
  });

  // ⚠️ Error handler
  bot.catch((err, ctx) => {
    if (logFlags.errors && shouldLog(ctx.chat?.id))
      log(`⚠️ ERROR in ${ctx?.chat?.title || ctx?.chat?.id}\n${err.message}`);
  });

  // 👑 Admin-only controls
  bot.command(["logon", "logoff"], async (ctx) => {
    const userId = ctx.from.id.toString();
    const ownerId = (process.env.OWNER_ID || "").toString();
    if (userId !== ownerId)
      return ctx.reply("🚫 You are not authorized to use this command.");

    const parts = ctx.message.text.split(" ");
    if (parts.length < 2)
      return ctx.reply("❓ Usage: /logon <messages|joins|errors|admin> or /logoff <...>");

    const key = parts[1].toLowerCase();
    if (!(key in logFlags))
      return ctx.reply("❌ Unknown type. Options: messages, joins, errors, admin");

    const enable = ctx.message.text.startsWith("/logon");
    logFlags[key] = enable;
    saveConfig();
    await ctx.reply(`✅ Logging for ${key} is now ${enable ? "ON" : "OFF"}`);
  });

  // 👑 Manage log groups
  bot.command(["loggroupadd", "loggroupremove"], async (ctx) => {
    const userId = ctx.from.id.toString();
    const ownerId = (process.env.OWNER_ID || "").toString();
    if (userId !== ownerId) return ctx.reply("🚫 Unauthorized");

    const parts = ctx.message.text.split(" ");
    if (parts.length < 2)
      return ctx.reply("❓ Usage: /loggroupadd <id> or /loggroupremove <id>");

    const targetId = parts[1].trim();
    if (ctx.message.text.startsWith("/loggroupadd")) {
      if (!logFlags.groups.map(String).includes(targetId)) {
        logFlags.groups.push(Number(targetId));
        saveConfig();
      }
      return ctx.reply(`✅ Group ${targetId} added to logging.`);
    } else {
      logFlags.groups = logFlags.groups.filter((id) => id.toString() !== targetId);
      saveConfig();
      return ctx.reply(`❌ Group ${targetId} removed from logging.`);
    }
  });

  // 📜 Status
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

  console.log("📜 SafeCat Logger active.");
}

module.exports = { setupLogger };
