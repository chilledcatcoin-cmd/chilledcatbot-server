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
 * ChilledCatBot - Bot Loader - bot.js - Initializes Telegraf + loads modules
 * Version: 1.4.0
 * Date: 2025-10-01
 *
 * Changelog:
 * v1.4.0 - Modularized: bot.js attaches commands, games, contests
 * v1.3.0 - Added /menu support
 * v1.0.0 - Initial Telegraf setup
 * =====================================================
 */

const { Telegraf } = require("telegraf");
const { setupCommands } = require("./commands");
const { setupContests } = require("./contests");

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) throw new Error("❌ Missing BOT_TOKEN");

const bot = new Telegraf(BOT_TOKEN);

// Load commands & contests
setupCommands(bot);
setupContests(bot);

module.exports = { bot };




// Simple in-memory log for now
const fs = require("fs");
const path = require("path");

const logFile = path.join(__dirname, "chatlog.txt");

// Middleware to log every message/chat
bot.use((ctx, next) => {
  if (ctx.chat && ctx.message) {
    const info = {
      id: ctx.chat.id,
      type: ctx.chat.type,
      title: ctx.chat.title || "",
      username: ctx.chat.username || "",
      first_name: ctx.chat.first_name || "",
      last_name: ctx.chat.last_name || "",
      text: ctx.message.text || "",
      date: new Date().toISOString(),
    };

    const line = `[${info.date}] ChatID: ${info.id}, Type: ${info.type}, ` +
                 `Title: ${info.title}, User: ${info.username || info.first_name || info.last_name}, ` +
                 `Msg: ${info.text}\n`;

    fs.appendFileSync(logFile, line);
    console.log("📝 Logged:", line.trim());
  }
  return next();
});

