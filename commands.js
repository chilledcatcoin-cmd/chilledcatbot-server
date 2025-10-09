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
 * ChilledCatBot - Commands - commands.js - Handles /start, /help, and Telegram command menu
 *
 * Version: 1.3.0
 * Date: 2025-10-08
 *
 * Changelog:
 * v1.3.0 - A fresh start
 * =====================================================
 */

const { GAMES } = require("./features/games");
const { contests } = require("./features/contests");
const { getLeaderboardCached } = require("./features/leaderboard");
const { contests } = require("./features/contests");
const { isWhitelisted } = require("./modules/safecat/protector");

async function setupCommands(bot) {
  // 🎮 Welcome & Help
  bot.start(async (ctx) => {
    await ctx.replyWithMarkdown(
      "😺 *Welcome to ChilledCatBot!*\n\n" +
        "Available commands:\n" +
        "🧊 /howchill — Check how chill you are\n" +
        "🔮 /fortune — Receive a Chilled Cat Fortune™\n" +
        "🎮 /games — See available Chilled Cat games\n" +
        "⚔️ /br — View Battle Royale commands\n" +
        "🏆 /leaderboard — View game leaderboards\n" +
        "🏓 /ping — Test if the bot is alive\n\n" +
        "_Stay tuned for more Chilled Cat features!_ 😼"
    );
  });

  bot.help(async (ctx) =>
    ctx.replyWithMarkdown(
      "💡 *Help Menu*\n\n" +
        "• `/howchill` — Find your Chill Level™\n" +
        "• `/fortune` — Receive a Chilled Cat Fortune™\n" +
        "• `/games` — View all available games\n" +
        "• `/leaderboard <game>` — View leaderboard\n" +
        "• `/br` — View Battle Royale commands (groups)\n" +
        "• `/ping` — Check if the bot is alive"
    )
  );

  // 🏓 Ping
  bot.command("ping", (ctx) => ctx.reply("🏓 Pong!"));

  // 🏆 Leaderboard
  bot.command("leaderboard", async (ctx) => {
    const parts = ctx.message.text.split(" ");
    const game = parts[1];

    if (!game || !GAMES[game]) {
      return ctx.reply("Usage: /leaderboard <flappycat|catsweeper>");
    }

    try {
      const data = await getLeaderboardCached(game);
      if (!data || !data.length)
        return ctx.reply("No leaderboard data yet.");

      let msg = `🏆 *${GAMES[game].title} — Global Leaderboard*\n\n`;
      data.forEach((p, i) => {
        msg += `${i + 1}. ${p.DisplayName || "Anonymous"} — ${p.StatValue}\n`;
      });
      await ctx.replyWithMarkdown(msg);
    } catch (err) {
      console.error("Leaderboard fetch failed:", err);
      await ctx.reply("⚠️ Could not fetch leaderboard at this time.");
    }
  });

  // 📜 Telegram command menus
  try {
    await Promise.all([
      bot.telegram.setMyCommands(
        [
          { command: "howchill", description: "Check your Chill Level™" },
          { command: "fortune", description: "Receive a Chilled Cat Fortune™" },
          { command: "games", description: "View Chilled Cat games" },
          { command: "leaderboard", description: "View game leaderboards" },
          { command: "ping", description: "Check if bot is alive" },
        ],
        { scope: { type: "default" } }
      ),
      bot.telegram.setMyCommands(
        [
          { command: "howchill", description: "Check your Chill Level™" },
          { command: "fortune", description: "Receive a Chilled Cat Fortune™" },
          { command: "games", description: "View Chilled Cat games" },
          { command: "leaderboard", description: "View game leaderboards" },
          { command: "br", description: "View Battle Royale commands" },
          { command: "brstart", description: "Start a new Battle Royale" },
          { command: "brcancel", description: "Cancel the current battle" },
          { command: "brjoin", description: "Join the battle" },
          { command: "brleave", description: "Leave the battle" },
          { command: "brstatus", description: "Check current status" },
          { command: "startcontest flappycat", description: "Start a contest (admin)" },
          { command: "startcontest catsweeper", description: "Start a contest (admin)" },
          { command: "endcontest flappycat", description: "End the current contest (admin)" },
          { command: "endcontest catsweeper", description: "End the current contest (admin)" },
        ],
        { scope: { type: "all_group_chats" } }
      ),
    ]);
    console.log("✅ Telegram command menus updated (DMs + Groups)");
  } catch (err) {
    console.error("❌ Failed to update command menus:", err);
  }
}

module.exports = { setupCommands };
