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
 * ChilledCatBot - Duel Feature - duel.js - Handles: global /duel command & shared duel roll logic
 *
 * Version: 1.1.0
 * Date: 2025-10-08
 *
 * Changelog:
 * v1.1.0 - Breaking it off and making duel its own feature that can be used in multiple games
 * =====================================================
 */

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * 🎲 Utility for other modules (Battle Royale, CoC, etc.)
 * Returns { name, emoji, roll }
 */
async function performDuelRoll(ctx, playerName) {
  const emoji = pick(["🎲", "🎯", "🏀", "🎳", "🎰"]);
  const diceMsg = await ctx.telegram.sendDice(ctx.chat.id, { emoji });
  return {
    name: playerName,
    emoji,
    roll: diceMsg.dice.value,
  };
}

/**
 * ⚔️ Global /duel command
 * Works anywhere — DMs or group chats
 */
async function handleGlobalDuel(ctx) {
  const challenger = `@${ctx.from.username || ctx.from.first_name}`;

  // In future we can expand this to support "/duel @target"
  // For now, it’s just a single dice duel against fate itself 😼
  const result = await performDuelRoll(ctx, challenger);

  await ctx.telegram.sendMessage(
    ctx.chat.id,
    `${result.emoji} ${challenger} duels fate and rolls a *${result.roll}*!`,
    { parse_mode: "Markdown" }
  );
}

/**
 * 🔧 Registers /duel command globally
 */
function setupDuelFeature(bot) {
  bot.command("duel", handleGlobalDuel);
  console.log("⚔️ Duel feature loaded. /duel command active globally.");
}

module.exports = {
  setupDuelFeature,
  performDuelRoll,
};