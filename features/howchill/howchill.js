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
 * ChilledCatBot - How Chill feature - howchill.js - How Chill are you command
 * A new "skill" or behavior to the brain
 *
 * Version: 1.1.0
 * Date: 2025-10-08
 *
 * Changelog:
 * v1.1.0 - A fresh start
 * =====================================================
 */

module.exports = {
  setupHowChill(bot) {
    bot.command("howchill", async (ctx) => {
      const user = ctx.from.first_name || "you";

      // Random chill level
      let chill = Math.floor(Math.random() * 101);

      // 🎲 Add some fun modifiers
      const username = (ctx.from.username || "").toLowerCase();
      const hour = new Date().getHours();
      const day = new Date().getDay();

      if (username.includes("cat")) chill += 10; // bonus for cat-themed users
      if (hour >= 0 && hour <= 5) chill += 5;   // night owls are chill
      if (day === 1) chill -= 5;                // Mondays are less chill
      chill = Math.min(100, Math.max(0, chill)); // clamp between 0–100

      // Pick verdict based on chill level
      let verdict;
      if (chill >= 90) verdict = "🐾 You’re the definition of chill. Certified Catnapper™ 💤";
      else if (chill >= 70) verdict = "😺 Smooth operator — nothing phases you.";
      else if (chill >= 50) verdict = "☕ Steady vibes. Somewhat chill, slightly caffeinated.";
      else if (chill >= 30) verdict = "🐈 You need a break and maybe a cat video or two.";
      else verdict = "🚨 Unchill detected! Touch grass immediately 🌿";

      await ctx.reply(
        `😼 *${user}*, your Chill Level™ is *${chill}%*\n${verdict}`,
        { parse_mode: "Markdown" }
      );
    });
  },
};
