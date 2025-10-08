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
 * ChilledCatBot - Commands - commands.js - Handles /start, /help, and Telegram command menu
 *
 * Version: 1.3.0
 * Date: 2025-10-08
 *
 * Changelog:
 * v1.3.0 - A fresh start
 * =====================================================
 */

function setupCommands(bot) {
  // 🎮 Welcome & Help
  bot.start((ctx) => {
    ctx.reply(
      "😺 *Welcome to ChilledCatBot!*\n\n" +
        "Available commands:\n" +
        "🧊 /howchill — Check how chill you are\n" +
        "🔮 /fortune — Receive a Chilled Cat Fortune™\n" +
        "⚔️ /br — View Battle Royale commands\n" +
        "🏓 /ping — Test if the bot is alive\n" +
        "\nStay tuned for more Chilled Cat features! 😼",
      { parse_mode: "Markdown" }
    );
  });

  // 💡 Help command
  bot.help((ctx) =>
    ctx.reply(
      "💡 Need help?\n\n" +
        "• /howchill — Find your Chill Level™\n" +
        "• /fortune — Receive a Chilled Cat Fortune™\n" +
        "• /br — View Battle Royale commands (groups only)\n" +
        "• /ping — Check if the bot is alive\n" +
        "\nStay tuned for more Chilled Cat features! 😼",
      { parse_mode: "Markdown" }
    )
  );

  // 🏓 Simple ping test
  bot.command("ping", (ctx) => ctx.reply("🏓 Pong!"));

  // 📜 Telegram command menus (split for DMs & Groups)
  Promise.all([
    // ✅ Default — DMs & private chats
    bot.telegram.setMyCommands(
      [
        { command: "howchill", description: "Check your Chill Level™" },
        { command: "fortune", description: "Receive a Chilled Cat Fortune™" },
        { command: "ping", description: "Check if bot is alive" },
      ],
      { scope: { type: "default" } }
    ),

    // ✅ All Group Chats
    bot.telegram.setMyCommands(
      [
        { command: "howchill", description: "Check your Chill Level™" },
        { command: "fortune", description: "Receive a Chilled Cat Fortune™" },
        { command: "br", description: "View Battle Royale command list" },
        { command: "ping", description: "Check if bot is alive" },
        { command: "br", description: "View Battle Royale command list" },
        { command: "brstart", description: "Start a new Battle Royale (admin)" },
        { command: "brcancel", description: "Cancel the current Battle Royale" },
        { command: "brforceend", description: "Force-end and declare a winner" },
        { command: "brjoin", description: "Join the current battle" },
        { command: "brleave", description: "Leave or forfeit" },
        { command: "roll", description: "Roll during a duel" },
        { command: "brstatus", description: "Check current battle status" },
      ],
      { scope: { type: "all_group_chats" } }
    ),
  ])
    .then(() => {
      console.log("✅ Telegram command menus updated:");
      console.log("   • Default (DMs) ✅");
      console.log("   • Group Chats ✅");
    })
    .catch((err) =>
      console.error("❌ Failed to set Telegram command menus:", err)
    );
}

module.exports = { setupCommands };
