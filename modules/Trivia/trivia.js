// /modules/Trivia/trivia.js
// ✅ Telegraf 4.x Compatible Trivia Engine (Per-Player Mode, Stable, with Progress Display)


const { shuffleArray, formatQuestion } = require("./utils");
const { loadTopicQuestions, getAvailableTopics } = require("./topics");
const { setupTroll } = require("./troll");

global.activeTriviaGames = global.activeTriviaGames || {};
const activeGames = global.activeTriviaGames;

const QUESTIONS_PER_GAME = 10;
const QUESTION_TIME = 15000; // 15 sec
const BREAK_TIME = 3000;     // 3 sec

function setupTrivia(bot) {
  console.log("🎮 Initializing Trivia module...");

// =====================================================
//  BUTTON HANDLERS  (A / B / C / D)
// =====================================================
bot.on("callback_query", async (ctx, next) => {
  try {
    const cbq = ctx.callbackQuery;
    if (!cbq?.message?.chat?.id) return next();

    const chatId = cbq.message.chat.id;
    const userId = ctx.from.id;
    const data = cbq.data;
    const match = /^([ABCD])(?:_(-?\d+))?$/.exec(data || "");
    if (!match) return next();

    const choice = match[1];
    const cbChatId = match[2] ? Number(match[2]) : chatId;
    if (cbChatId !== chatId) return ctx.answerCbQuery("⚠️ Stale button, new question is live.");

    const game = activeGames[chatId];
    if (!game) return ctx.answerCbQuery("❌ No trivia game running.");

    if (!game.answers) game.answers = {};
    if (game.answers[userId]) return ctx.answerCbQuery("😼 You already answered!");

    // ✅ Save answer safely and persist immediately
    game.answers[userId] = choice;
    activeGames[chatId] = { ...game }; // force re-store (not by reference)
    console.log(`🎯 ${ctx.from.first_name} picked ${choice} for Q${game.currentIndex + 1}`);
    console.log(`📥 Answers snapshot now:`, activeGames[chatId].answers);

    await ctx.answerCbQuery(`✅ ${choice} locked in`);
  } catch (err) {
    console.error("🔥 CALLBACK ERROR:", err);
    try { await ctx.answerCbQuery("⚠️ Callback handling failed"); } catch {}
  }
});



  bot.action("ignore", async (ctx) => ctx.answerCbQuery());

  // =====================================================
  //  /triviatopics
  // =====================================================
  bot.command("triviatopics", async (ctx) => {
    const topics = getAvailableTopics();
    let msg = "📚 *Available Trivia Topics:*\n\n";
    topics.forEach((t, i) => {
      msg += `${i + 1}. ${t.name}\n   _${t.description}_\n\n`;
    });
    msg += "Use /trivia to start a game as an admin.";
    await ctx.reply(msg, { parse_mode: "Markdown" });
  });

  // =====================================================
  //  /trivia — start game (with fallback)
  // =====================================================

  // Fallback for when Telegram doesn't tag it as a command
  bot.hears(/^\/trivia(@\w+)?$/, async (ctx) => {
    console.log("🔥 /trivia triggered via hears()");
    await handleTriviaStart(ctx, bot);
  });

  // Standard command trigger
  bot.command("trivia", async (ctx) => {
    console.log("🔥 /trivia triggered via command()");
    await handleTriviaStart(ctx, bot);
  });

  // =====================================================
  //  Handle admin topic reply
  // =====================================================
  bot.on("message", async (replyCtx, next) => {
    const chatId = replyCtx.chat.id;
    const awaiting = bot.context.awaitingTriviaReply?.[chatId];
    if (!awaiting || awaiting !== replyCtx.from.id) return next();

    const text = replyCtx.message?.text?.trim() || "";
    if (!/^\d+$/.test(text)) return next();

    const index = parseInt(text, 10);
    const topicsArr = getAvailableTopics();

    if (index < 1 || index > topicsArr.length) {
      await replyCtx.reply("❌ Invalid selection. Try /trivia again.");
      delete bot.context.awaitingTriviaReply[chatId];
      return;
    }

    const topic = topicsArr[index - 1];
    console.log(`🎯 Loading questions for topic: ${topic.name} (${topic.key})`);

    const questions = loadTopicQuestions(topic.key);
    if (!questions || !questions.length) {
      await replyCtx.reply("⚠️ Failed to load questions for this topic. Cancelling game.");
      delete bot.context.awaitingTriviaReply[chatId];
      return;
    }

    delete bot.context.awaitingTriviaReply[chatId];
    await startTrivia(replyCtx, topic.key, replyCtx.from.id);
  });

  // =====================================================
  //  /triviaskip & /triviaend
  // =====================================================
  bot.command("triviaskip", (ctx) => {
    const chatId = ctx.chat.id;
    const userId = ctx.from.id;
    const game = activeGames[chatId];
    if (!game) return ctx.reply("No trivia game running here.");
    if (game.adminId !== userId)
      return ctx.reply("Only the admin who started can skip.");
    clearTimeout(game.timer);
    ctx.reply("⏭ Skipping question...");
    nextQuestion(ctx);
  });

  bot.command("triviaend", (ctx) => {
    const chatId = ctx.chat.id;
    const userId = ctx.from.id;
    const game = activeGames[chatId];
    if (!game) return ctx.reply("No trivia game running here.");
    if (game.adminId !== userId)
      return ctx.reply("Only the admin who started can end it.");
    endTrivia(ctx, "Game ended early.");
  });

  setupTroll(bot);
  console.log("🎲 Trivia ready (Per-Player Mode, Telegraf 4.x)");
}

// =====================================================
//  START GAME HANDLER
// =====================================================
async function handleTriviaStart(ctx, bot) {
  const chatId = ctx.chat.id;
  const userId = ctx.from.id;
  const admins = await ctx.telegram.getChatAdministrators(chatId);
  const isAdmin = admins.some((a) => a.user.id === userId);
  if (!isAdmin) return ctx.reply("😼 Only group admins can start trivia.");

  if (activeGames[chatId]) return ctx.reply("A trivia game is already running here!");

  const topics = getAvailableTopics();
  let msg = "📘 *Choose a trivia topic:*\n\n";
  topics.forEach((t, i) => {
    msg += `${i + 1}. ${t.name}\n   _${t.description}_\n\n`;
  });
  msg += "Reply with the topic number to start.";
  await ctx.reply(msg, { parse_mode: "Markdown" });

  bot.context.awaitingTriviaReply ??= {};
  bot.context.awaitingTriviaReply[chatId] = userId;
}

// =====================================================
//  GAME FLOW
// =====================================================
async function startTrivia(ctx, topicKey, adminId) {
  const chatId = ctx.chat.id;
  const questions = loadTopicQuestions(topicKey);
  if (!questions || !questions.length) {
    return ctx.reply("⚠️ No questions found for this topic.");
  }

  console.log(`✅ Loaded ${questions.length} questions for topic '${topicKey}'`);
  const shuffled = shuffleArray(questions).slice(0, QUESTIONS_PER_GAME);
  activeGames[chatId] = {
    topic: topicKey,
    questions: shuffled,
    currentIndex: -1,
    scores: {},
    answers: {},
    adminId,
    timer: null,
  };

  await ctx.reply("🎯 Trivia starting in 3 seconds...");
  setTimeout(() => nextQuestion(ctx), 3000);
}

// =====================================================
//  NEXT QUESTION (with progress display)
// =====================================================
function nextQuestion(ctxOrChatId) {
  const chatId = typeof ctxOrChatId === "object" ? ctxOrChatId.chat.id : ctxOrChatId;
  const game = activeGames[chatId];
  if (!game) return;

  game.currentIndex++;
  game.answers = {};

  if (game.currentIndex >= game.questions.length) {
    return endTrivia({ chat: { id: chatId } });
  }

  const q = game.questions[game.currentIndex];
  const progress = `🧠 *Question ${game.currentIndex + 1}/${QUESTIONS_PER_GAME}:*`;
  const { text } = formatQuestion(q, game.currentIndex + 1);

  const keyboard = {
    inline_keyboard: [[
      { text: "A", callback_data: `A_${chatId}` },
      { text: "B", callback_data: `B_${chatId}` },
      { text: "C", callback_data: `C_${chatId}` },
      { text: "D", callback_data: `D_${chatId}` },
    ]],
  };

  global.bot.telegram.sendMessage(chatId, `${progress}\n\n${text}`, {
    reply_markup: keyboard,
    parse_mode: "Markdown",
  }).catch(err => console.error("⚠️ sendMessage failed:", err));

game.timer = setTimeout(() => {
  console.log(`🕒 Time's up for question ${game.currentIndex + 1} — waiting for late answers...`);
setTimeout(() => {
  console.log(`🕒 Time's up for question ${game.currentIndex + 1} — waiting for late answers...`);
  setTimeout(() => checkAnswers(chatId), 4000); // 4s grace
}, QUESTION_TIME);

}

// =====================================================
//  CHECK ANSWERS — uses chatId directly
// =====================================================
function checkAnswers(chatId) {
const game = { ...activeGames[chatId] }; // clone current snapshot to avoid stale ref

  if (!game) return;

  console.log("🧮 Checking answers:", game.answers);

  const q = game.questions[game.currentIndex];
  const correct = ["A", "B", "C", "D"][q.answer];
  const correctText = q.options[q.answer];

  const winners = [];
  for (const [userId, choice] of Object.entries(game.answers)) {
    if (choice === correct) {
      game.scores[userId] = (game.scores[userId] || 0) + 1;
      winners.push(userId);
    }
  }

  let msg = `✅ *Correct answer:* ${correct}) ${correctText}\n`;
  msg += winners.length
    ? `🏅 ${winners.length} got it right!`
    : `😿 No correct answers this round.`;

  global.bot.telegram.sendMessage(chatId, msg, { parse_mode: "Markdown" })
    .then(() => console.log("✅ Results sent for question", game.currentIndex + 1))
    .catch(err => console.error("⚠️ Failed to send result:", err));

  setTimeout(() => nextQuestion(chatId), BREAK_TIME);
}

// =====================================================
//  END TRIVIA
// =====================================================
function endTrivia(ctx, note) {
  const chatId = ctx.chat.id;
  const game = activeGames[chatId];
  if (!game) return;

  const results = Object.entries(game.scores)
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score);

  let msg = "🎉 *Trivia Results!*\n\n";
  if (!results.length) {
    msg += "No points scored. Everyone needs a refresher! 😹";
  } else {
    results.forEach((r, i) => {
      msg += `${i + 1}. [${r.id}]: ${r.score} points\n`;
    });

    if (results.length > 1 && results[0].score === results[1].score) {
      const top = results.filter(r => r.score === results[0].score);
      const names = top.map(r => `[${r.id}]`).join(" and ");
      msg += `\n🤝 It's a tie between ${names}!\nUse /troll to settle it! 🎲`;
    }
  }

  if (note) msg += `\n\n${note}`;
  ctx.reply(msg, { parse_mode: "Markdown" });

  clearTimeout(game.timer);
  delete activeGames[chatId];
}

module.exports = { setupTrivia };
