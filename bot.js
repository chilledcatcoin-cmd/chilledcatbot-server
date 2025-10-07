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
const { setupTrivia } = require("./modules/Trivia");
// const { setupLogging } = require("./features/logging");
const { setupFortune } = require("./modules/Fortune");
// const { setupChillOrChaos } = require("./modules/CoC");
const { setupHowChill } = require("./modules/HowChill");
const { setupBattleRoyale } = require("./modules/BattleRoyale");

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) throw new Error("❌ Missing BOT_TOKEN");

// =====================================================
//  Initialize Telegraf
// =====================================================
const bot = new Telegraf(BOT_TOKEN);
global.bot = bot; // ✅ make available to trivia/troll modules

// =====================================================
//  Debugging (optional, safe to remove later)
// =====================================================
// Debug (non-blocking)
bot.on("message", (ctx, next) => {
  console.log("📨 MESSAGE RECEIVED:", ctx.message.text || "[non-text]");
  return next();
});

bot.on("callback_query", async (ctx, next) => {
  const cbq = ctx.callbackQuery;
  if (!cbq) return next();

// ✅ Handle Telegram games (Flappy Cat, CatSweeper)
if (cbq.game_short_name) {
  console.log(`🎮 Launching Telegram game: ${cbq.game_short_name}`);
  return ctx.answerCbQuery(); // allow Telegram to open the HTML game
}

if (cbq.data) {
  console.log("📬 GLOBAL CALLBACK RECEIVED:", cbq.data);

  // 🧠 Only handle truly global callbacks, not games or trivia
  const data = cbq.data || "";
  if (/^(A|B|C|D)_/.test(data)) {
    // It’s a trivia button — let trivia.js handle it
    return next();
  }

  // Handle other callbacks (Battle Royale, etc.)
  await ctx.answerCbQuery("✅ Received!");
  return;
}


  return next();
});

// =====================================================
//  Load Features
// =====================================================
setupCommands(bot);
setupContests(bot);
setupGroupGuard(bot);
// setupLogging(bot);
setupFortune(bot);
// setupChillOrChaos(bot);
setupHowChill(bot);
setupBattleRoyale(bot);
setupTrivia(bot);

// =====================================================
//  Safe Polling Launch (recommended for Render)
// =====================================================
(async () => {
  try {
    console.log("🌐 Ensuring webhook is disabled...");
    await bot.telegram.deleteWebhook({ drop_pending_updates: true });

    console.log("⚙️ Syncing command list...");
    await bot.telegram.setMyCommands([
      { command: "trivia", description: "Start a trivia game" },
      { command: "triviaskip", description: "Skip the current trivia question" },
      { command: "triviaend", description: "End the trivia game" },
      { command: "triviatopics", description: "List available trivia topics" },
    ]);

    console.log("🚀 Launching bot in polling mode...");
    await bot.launch({ dropPendingUpdates: true });

    console.log("😺 ChilledCatBot is online and ready to chill (polling mode).");
  } catch (err) {
    console.error("❌ Bot launch failed:", err);
  }
})();

// =====================================================
//  Graceful Shutdown
// =====================================================
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

module.exports = { bot };
