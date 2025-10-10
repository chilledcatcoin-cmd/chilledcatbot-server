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
 * ChilledCatBot - Core Initialzer - bot.js - Creates telegraf bot instance, connects commands 
 * and feature modules, exports the ready-to-use bot instance to be mounted by the express
 * server in index.js
 * Builds the brain, installs instincts and exports it.
 * Version: 1.6.0
 * Date: 2025-10-08
 *
 * Changelog:
 * v1.6.0 - A fresh start
 * =====================================================
 */

const { Telegraf } = require("telegraf");
const { setupCommands } = require("./commands");
const { setupHowChill } = require("./features/howchill");
const { setupFortune } = require("./features/fortune");
const { setupBattleRoyale } = require("./features/battleroyale");
const { setupDuelFeature } = require("./features/duel");
const { setupSafeCat } = require("./modules/safecat");
const { setupGames } = require("./features/games");
const { setupLeaderboard } = require("./features/leaderboard");
const { setupContests } = require("./features/contests");
const { setupDailyStats } = require("./features/dailystats");

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) throw new Error("❌ Missing BOT_TOKEN in environment");

const bot = new Telegraf(BOT_TOKEN);

// 👋 Basic test command
bot.start((ctx) => ctx.reply("😺 ChilledCatBot is alive and ready to chill!"));

// 🧊 Load first feature
setupSafeCat(bot);
setupCommands(bot);
setupHowChill(bot);
setupFortune(bot);
setupBattleRoyale(bot);
setupDuelFeature(bot);
setupGames(bot);
setupLeaderboard(bot);
setupContests(bot);
setupDailyStats(bot);

console.log("🚀 ChilledCatBot running.");

module.exports = { bot };
