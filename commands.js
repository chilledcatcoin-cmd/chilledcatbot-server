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
 * ChilledCatBot - Commands - commands.js - Registers /start, /menu, /leaderboard
 * Version: 1.4.0
 * Date: 2025-10-01
 *
 * Changelog:
 * v1.4.0 - Extracted commands into own file
 * v1.3.0 - Added inline keyboards to /menu
 * v1.2.0 - Leaderboard supports global + group
 * v1.0.0 - Basic /start + /flappycat + /catsweeper
 * =====================================================
 */

const { getLeaderboardCached, formatLeaderboard } = require("./leaderboard");

module.exports = (bot) => {
  bot.start((ctx) => {
    ctx.reply("😺 Welcome to *Chilled Cat Games!*\n\nCommands:\n" +
              "🎮 /flappycat — Play Flappy Cat\n" +
              "💣 /catsweeper — Play CatSweeper\n" +
              "🏆 /leaderboard <game> [global|group]",
              { parse_mode: "Markdown" });
  });

  bot.command("menu", (ctx) => {
    ctx.reply("📋 Main Menu", {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "🏆 FlappyCat Global", callback_data: "lb_flappycat_global" },
            { text: "🏆 FlappyCat Group", callback_data: "lb_flappycat_group" }
          ],
          [
            { text: "🏆 CatSweeper Global", callback_data: "lb_catsweeper_global" },
            { text: "🏆 CatSweeper Group", callback_data: "lb_catsweeper_group" }
          ]
        ]
      }
    });
  });

  bot.command("leaderboard", async (ctx) => {
    const parts = ctx.message.text.split(" ");
    const game = parts[1];
    const scope = parts[2] || "global";

    let statName = scope === "group" ? `${game}_${ctx.chat.id}` : `${game}_global`;

    try {
      const list = await getLeaderboardCached(statName);
      ctx.reply(formatLeaderboard(game, scope, list), { parse_mode: "Markdown" });
    } catch (e) {
      console.error("Leaderboard error", e.response?.data || e.message);
      ctx.reply("⚠️ Failed to fetch leaderboard.");
    }
  });
};
