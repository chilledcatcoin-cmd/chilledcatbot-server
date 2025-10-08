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
 *  Challenge System with Cooldown
 * ----------------------------------------------------- */
const COOLDOWN_MS = 15000; // 15 seconds
const duelCooldowns = new Map(); // chatId → timestamp

/* -----------------------------------------------------
 *  /challenge (PvP Duel)
 * ----------------------------------------------------- */
async function handleChallenge(ctx) {
  const challenger = `@${ctx.from.username || ctx.from.first_name}`;
  const chatId = ctx.chat.id;
  const now = Date.now();

  // 🚫 Prevent spam — check cooldown
  if (duelCooldowns.has(chatId) && now - duelCooldowns.get(chatId) < COOLDOWN_MS) {
    const remaining = Math.ceil((COOLDOWN_MS - (now - duelCooldowns.get(chatId))) / 1000);
    return ctx.reply(`⌛ Please wait ${remaining}s before starting another duel.`);
  }

  // 🚫 Prevent overlapping challenges
  if (activeChallenges.has(chatId)) {
    return ctx.reply("⚠️ There's already an open challenge in this chat!");
  }

  // ✅ Record challenge
  activeChallenges.set(chatId, { challengerId: ctx.from.id, challenger });

  const message = await ctx.replyWithMarkdown(
    `😼 *${challenger}* has issued a duel challenge!\nClick below to accept.`,
    {
      reply_markup: {
        inline_keyboard: [[{ text: "⚔️ Accept Duel", callback_data: "accept_duel" }]],
      },
    }
  );

  // ⏰ Auto-expire after 60 seconds
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
 *  Handle Button Response — Cinematic Duel Version
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

  // Remove challenge record
  activeChallenges.delete(chatId);

  // Announce duel start
  await ctx.editMessageText(`⚔️ *${challenger}* vs *${opponent}* — the duel begins!`, {
    parse_mode: "Markdown",
  });

  // 🎲 One shared dice animation (the “start signal”)
  const diceMsg = await ctx.telegram.sendDice(ctx.chat.id, { emoji: "🎲" });
  const baseEmoji = diceMsg.dice.emoji;

  // Wait a moment for animation to finish rolling
  await new Promise((r) => setTimeout(r, 2500));

  // 🎯 Challenger roll
  const challengerRoll = Math.floor(Math.random() * 6) + 1;
  await ctx.replyWithMarkdown(`🎯 ${challenger} rolls... *${challengerRoll}*!`);
  await new Promise((r) => setTimeout(r, 2000));

  // 🎯 Opponent roll
  const opponentRoll = Math.floor(Math.random() * 6) + 1;
  await ctx.replyWithMarkdown(`🎯 ${opponent} rolls... *${opponentRoll}*!`);
  await new Promise((r) => setTimeout(r, 2000));

  // 🧩 Shared duel object
  const duel = {
    chatId,
    challenger,
    opponent,
    results: {
      [challenger]: challengerRoll,
      [opponent]: opponentRoll,
    },
  };

  // 🧠 Determine outcome
  let result;
  if (challengerRoll > opponentRoll)
    result = `🏆 *${challenger}* wins with a ${challengerRoll} vs ${opponentRoll}!`;
  else if (opponentRoll > challengerRoll)
    result = `🏆 *${opponent}* wins with a ${opponentRoll} vs ${challengerRoll}!`;
  else result = `😼 It’s a draw! Both rolled ${challengerRoll}!`;

  // 🧾 Final reveal
  await ctx.replyWithMarkdown(
    `${baseEmoji} *Duel Results*\n\n` +
      `🎯 ${challenger}: *${challengerRoll}*\n` +
      `🎯 ${opponent}: *${opponentRoll}*\n\n` +
      result
  );

  // 🕒 Cooldown
  duelCooldowns.set(chatId, Date.now());

  return duel;
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