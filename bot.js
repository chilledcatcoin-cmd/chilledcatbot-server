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
 * Version: 1.5.0
 * Date: 2025-10-03
 *
 * Changelog:
 * v1.5.0 - Added logging
 * v1.4.0 - Modularized: bot.js attaches commands, games, contests
 * v1.3.0 - Added /menu support
 * v1.0.0 - Initial Telegraf setup
 * =====================================================
 */

const { Telegraf } = require("telegraf");
const { setupCommands } = require("./commands");
const { setupContests } = require("./contests");
const { setupGroupGuard } = require("./features/groupguard");
const { setupLogging } = require("./features/logging");
const { setupFortune } = require("./fortune");
// const { setupChillOrChaos } = require("./modules/CoC");
const { setupHowChill } = require("./features/howchill");
const { setupBattleRoyale } = require("./modules/BattleRoyale/battleRoyale");

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) throw new Error("❌ Missing BOT_TOKEN");

const bot = new Telegraf(BOT_TOKEN); // ✅ Define bot BEFORE using it

// Log custom emoji IDs
bot.on("message", async (ctx) => {
  try {
    const entities = ctx.message?.entities || ctx.message?.caption_entities;
    if (!entities) return;

    for (const e of entities) {
      if (e.type === "custom_emoji") {
        const emojiText = ctx.message.text?.substring(e.offset, e.offset + e.length);
        console.log("Custom emoji ID:", e.custom_emoji_id);
        await ctx.reply(
          `😸 Custom emoji detected: ${emojiText}\n<code>${e.custom_emoji_id}</code>`,
          { parse_mode: "HTML" }
        );
      }
    }
  } catch (err) {
    console.error("Emoji handler error:", err);
  }
});


// Load features
setupCommands(bot);
setupContests(bot);
setupGroupGuard(bot);
setupLogging(bot);
setupFortune(bot);
// setupChillOrChaos(bot);
setupHowChill(bot);
setupBattleRoyale(bot);

module.exports = { bot };



