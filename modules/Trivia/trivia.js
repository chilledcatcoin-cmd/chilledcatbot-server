// /modules/Trivia/trivia.js
// ✅ Telegraf 4.x Compatible Trivia Engine (Per-Player Mode, Stable)

const { activeGames } = require("./state");
const { shuffleArray, formatQuestion } = require("./utils");
const { loadTopicQuestions, getAvailableTopics } = require("./topics");
const { setupTroll } = require("./troll");

const QUESTIONS_PER_GAME = 10;
const QUESTION_TIME = 15000; // 15 sec
const BREAK_TIME = 3000;     // 3 sec

function setupTrivia(bot) {
  console.log("🎮 Initializing Trivia module...");

  // =====================================================
  //  BUTTON HANDLERS  (A / B / C / D) — must be registered early
  // =====================================================
  bot.action(/^[ABCD]$/, async (ctx, next) => {
    try {
      const cbq = ctx.callbackQuery;
      if (!cbq?.message?.chat?.id) return next();
      const chatId = cbq.message.chat.id;
      const userId = ctx.from.id;
      const choice = cbq.data;

      const game = activeGames[chatId];
      if (!game) return ctx.answerCbQuery("❌ No trivia game running.");

      // prevent multiple answers per player
      if (game.answers[userId]) {
        return ctx.answerCbQuery("😼 You already answered!");
      }

      // record choice
      game.answers[userId] = choice;
      console.log(`🎯 ${ctx.from.username || userId} answered ${choice}`);
      await ctx.answerCbQuery(`✅ Answer recorded: ${choice}`);

      // Per-player mode: do NOT edit the message markup (it would affect everyone)
      // We rely on the stored answer to reject further taps from this user.
      return;
    } catch (err) {
      console.error("⚠️ Trivia callback error:", err);
      return ctx.answerCbQuery("⚠️ Error handling answer");
    }
  });

  // (Optional) If some modules send "ignore" buttons, swallow them safely.
  bot.action("ignore", async (ctx) => ctx.answerCbQuery());

  // =====================================================
  //  /triviatopics — list categories
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
  //  /trivia — start game (admin only)
  // =====================================================
  bot.command("trivia", async (ctx) => {
    const chatId = ctx.chat.id;
    const userId = ctx.from.id;

    // only admins can start
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

    // mark awaiting topic reply
    bot.context.awaitingTriviaReply ??= {};
    bot.context.awaitingTriviaReply[chatId] = userId;
  });

  // =====================================================
  //  Handle admin topic reply (one-shot per chat)
  //  IMPORTANT: call `next()` when not handling, or commands like /triviaend break.
  // =====================================================
  bot.on("message", async (replyCtx, next) => {
    const chatId = replyCtx.chat.id;
    const awaiting = bot.context.awaitingTriviaReply?.[chatId];
    // If no pending selection or not from the initiating admin -> pass through
    if (!awaiting || awaiting !== replyCtx.from.id) return next();

    // Only consume a plain numeric reply as topic index; otherwise pass through
    const text = replyCtx.message?.text?.trim() || "";
    if (!/^\d+$/.test(text)) return next();

    const index = parseInt(text, 10);
    const topicsArr = getAvailableTopics();

    if (isNaN(index) || index < 1 || index > topicsArr.length) {
      await replyCtx.reply("❌ Invalid selection. Try /trivia again.");
      delete bot.context.awaitingTriviaReply[chatId];
      return; // handled -> do not call next()
    }

    const topic = topicsArr[index - 1];
    console.log(`🎯 Loading questions for topic: ${topic.name} (${topic.key})`);

    const questions = loadTopicQuestions(topic.key);
    if (!questions || !questions.length) {
      await replyCtx.reply("⚠️ Failed to load questions for this topic. Cancelling game.");
      delete bot.context.awaitingTriviaReply[chatId];
      return; // handled
    }

    delete bot.context.awaitingTriviaReply[chatId];
    await startTrivia(replyCtx, topic.key, replyCtx.from.id);
    // handled -> do not call next()
  });

  // =====================================================
  //  /triviaskip  &  /triviaend
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

  // ===== integrate /troll =====
  setupTroll(bot);
  console.log("🎲 Trivia ready (Per-Player Mode, Telegraf 4.x)");
}

// =====================================================
//  GAME FLOW FUNCTIONS
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

function nextQuestion(ctx) {
  const chatId = ctx.chat.id;
  const game = activeGames[chatId];
  if (!game) return;

  game.currentIndex++;
  game.answers = {};

  if (game.currentIndex >= game.questions.length) {
    return endTrivia(ctx);
  }

  const q = game.questions[game.currentIndex];
  const { text } = formatQuestion(q, game.currentIndex + 1);
  const keyboard = {
    inline_keyboard: [[
      { text: "A", callback_data: "A" },
      { text: "B", callback_data: "B" },
      { text: "C", callback_data: "C" },
      { text: "D", callback_data: "D" },
    ]],
  };

  ctx.reply(text, { reply_markup: keyboard, parse_mode: "Markdown" });
  game.timer = setTimeout(() => checkAnswers(ctx), QUESTION_TIME);
}

function checkAnswers(ctx) {
  const chatId = ctx.chat.id;
  const game = activeGames[chatId];
  if (!game) return;

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

  ctx.reply(msg, { parse_mode: "Markdown" });
  setTimeout(() => nextQuestion(ctx), BREAK_TIME);
}

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
