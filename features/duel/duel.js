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

let activeGameContext = null; // e.g. Battle Royale or future game
const activeChallenges = new Map(); // key: chatId, value: challenger info

/* -----------------------------------------------------
 *  Helper Utilities
 * ----------------------------------------------------- */
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function performDuelRoll(ctx, playerName) {
  const emoji = pick(["🎲", "🎯", "🏀", "🎳", "🎰"]);
  const diceMsg = await ctx.telegram.sendDice(ctx.chat.id, { emoji });
  return {
    name: playerName,
    emoji,
    roll: diceMsg.dice.value,
  };
}

/* -----------------------------------------------------
 *  Context-Aware /duel
 * ----------------------------------------------------- */
async function handleGlobalDuel(ctx) {
  // 🧱 No game context → do nothing at all
  if (!activeGameContext) return;

  // ⚙️ If game explicitly defines duel behavior → run it
  if (typeof activeGameContext.onDuelCommand === "function") {
    try {
      await activeGameContext.onDuelCommand(ctx);
    } catch (err) {
      console.error("⚠️ Duel context error:", err);
    }
  }

  // 🚫 Otherwise: ignore completely (no fallback roll)
  return;
}

/* -----------------------------------------------------
 *  /challenge (PvP Duel)
 * ----------------------------------------------------- */
async function handleChallenge(ctx) {
  const challenger = `@${ctx.from.username || ctx.from.first_name}`;
  const chatId = ctx.chat.id;

  // Prevent spam: only one challenge at a time per chat
  if (activeChallenges.has(chatId)) {
    return ctx.reply("⚠️ There's already an open challenge in this chat!");
  }

  // Store challenger info
  activeChallenges.set(chatId, { challengerId: ctx.from.id, challenger });

  // Send challenge message with button
  const message = await ctx.replyWithMarkdown(
    `😼 *${challenger}* has issued a duel challenge!\nClick below to accept.`,
    {
      reply_markup: {
        inline_keyboard: [[{ text: "⚔️ Accept Duel", callback_data: "accept_duel" }]],
      },
    }
  );

  // Auto-expire after 60 seconds
  setTimeout(() => {
    if (activeChallenges.has(chatId)) {
      activeChallenges.delete(chatId);
      ctx.telegram.editMessageText(
        chatId,
        message.message_id,
        null,
        `⌛ The duel challenge from ${challenger} has expired.`
      );
    }
  }, 60000);
}

/* -----------------------------------------------------
 *  Handle Button Response
 * ----------------------------------------------------- */
async function handleAcceptDuel(ctx) {
  const chatId = ctx.chat.id;
  const challenge = activeChallenges.get(chatId);
  if (!challenge) return ctx.answerCbQuery("⚠️ No active challenge!");

  const challenger = challenge.challenger;
  const opponent = `@${ctx.from.username || ctx.from.first_name}`;

  // Prevent self-duel
  if (ctx.from.id === challenge.challengerId) {
    return ctx.answerCbQuery("😹 You can’t duel yourself!");
  }

  activeChallenges.delete(chatId);

  await ctx.editMessageText(`⚔️ *${challenger}* vs *${opponent}* — the duel begins!`, {
    parse_mode: "Markdown",
  });

  const r1 = await performDuelRoll(ctx, challenger);
  const r2 = await performDuelRoll(ctx, opponent);

  let result;
  if (r1.roll > r2.roll)
    result = `🏆 *${challenger}* wins the duel with a ${r1.roll} against ${r2.roll}!`;
  else if (r2.roll > r1.roll)
    result = `🏆 *${opponent}* wins the duel with a ${r2.roll} against ${r1.roll}!`;
  else result = `😼 It’s a draw! Both rolled ${r1.roll}!`;

  await ctx.replyWithMarkdown(result);
}

/* -----------------------------------------------------
 *  Context Management
 * ----------------------------------------------------- */
function setActiveDuelContext(context) {
  activeGameContext = context;
}

/* -----------------------------------------------------
 *  Setup
 * ----------------------------------------------------- */
function setupDuelFeature(bot) {
  bot.command("duel", handleGlobalDuel);
  bot.command("challenge", handleChallenge);
  bot.action("accept_duel", handleAcceptDuel);

  console.log("⚔️ Duel system loaded. /duel (context-aware) and /challenge active.");
}

module.exports = {
  setupDuelFeature,
  performDuelRoll,
  setActiveDuelContext,
};