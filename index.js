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
 * ChilledCatBot - Entry Point -  index.js - Loads the environment variables, starts an
 * express web server, registers the telgraf bot's webhook endpoint, tells telegram to
 * send all bot updates here and keeps the bot alive in host environment.
 * Puts the brain inside a body (Express server) and connects it to Telegram via webhook.
 * Version: 1.6.0
 * Date: 2025-10-08
 *
 * Changelog:
 * v1.6.0 - A fresh start
 * =====================================================
 */

require("dotenv").config();
const express = require("express");
const { bot } = require("./bot");

// =====================================================
// 🎮 Global Callback Handler — Game Score Integration
// =====================================================
const { contests } = require("./features/contests/contests");
const { recordScore } = require("./features/leaderboard/leaderboard");

// Handles all callback queries (button presses, game results, etc.)
bot.on("callback_query", async (ctx) => {
  try {
    const data = ctx.callbackQuery?.data || "";
    const from = ctx.from;
    const chatId = ctx.chat?.id;

    // Example: "score_flappycat_123"
    if (data.startsWith("score_")) {
      const [, game, scoreStr] = data.split("_");
      const score = parseInt(scoreStr);

      // Check if a contest is active in this chat
      const contest = contests.get(chatId);
      if (contest && contest.game === game && Date.now() < contest.expires) {
        await recordScore(from, game, score, "contest", chatId);
        console.log(`🏅 Recorded ${from.first_name}'s ${game} contest score: ${score}`);
      } else {
        // Otherwise treat as a normal score (global)
        await recordScore(from, game, score, "global");
        console.log(`🌍 Recorded ${from.first_name}'s ${game} global score: ${score}`);
      }
    }

    await ctx.answerCbQuery();
  } catch (err) {
    console.error("⚠️ Error handling callback_query:", err);
  }
});




// =====================================================
// 🎮 Dynamic Game Launch Handler (Contest + Normal Mode)
// =====================================================
const { GAMES } = require("./features/games/games");

bot.on("callback_query", async (ctx) => {
  const query = ctx.callbackQuery;
  const from = ctx.from;
  const chatId = ctx.chat?.id;

  // 🎮 Only handle game launches (ignore trivia / score / buttons)
  if (!query.game_short_name) return;

  const gameShortName = query.game_short_name;
  const gameInfo = GAMES[gameShortName];
  if (!gameInfo) return ctx.answerCbQuery("⚠️ Unknown game.");

  // 🐾 Get active contest in this chat (if any)
  const contest = contests.get(chatId);

  // 👤 Serialize player info to pass to the game
  const userData = encodeURIComponent(
    JSON.stringify({
      id: from.id,
      username: from.username,
      first_name: from.first_name,
      chat_id: chatId,
    })
  );

  // 🏁 If there’s a contest running for this game in this chat
  if (contest && contest.game === gameShortName) {
    const launchUrl = `${gameInfo.url}?contest=${contest.key}&end=${contest.expires}&chat=${chatId}&user=${userData}`;
    console.log(`🎯 Launching contest mode for ${gameShortName} in chat ${chatId}`);
    return ctx.answerCbQuery({ url: launchUrl });
  }

  // 🌍 Otherwise launch normal version
  const normalUrl = `${gameInfo.url}?user=${userData}`;
  console.log(`🎮 Launching normal mode for ${gameShortName} in chat ${chatId}`);
  return ctx.answerCbQuery({ url: normalUrl });
});





const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const BOT_TOKEN = process.env.BOT_TOKEN;

(async () => {
  try {
    if (!WEBHOOK_URL) throw new Error("❌ Missing WEBHOOK_URL");

    const webhookPath = `/bot${BOT_TOKEN}`;
    const webhookEndpoint = `${WEBHOOK_URL}${webhookPath}`;

    console.log("🌐 Setting Telegram webhook to:", webhookEndpoint);
      await bot.telegram.setWebhook(webhookEndpoint, {
      allowed_updates: ["message", "callback_query", "chat_member", "my_chat_member"]
    });


    // Bind Telegram webhook to Express
    app.use(bot.webhookCallback(webhookPath));
    app.get("/", (req, res) => res.send("✅ ChilledCatBot webhook running fine."));

    app.listen(PORT, () => console.log(`🚀 Webhook server active on port ${PORT}`));
  } catch (err) {
    console.error("❌ Failed to start webhook:", err);
  }
})();