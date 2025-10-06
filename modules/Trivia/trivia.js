// /modules/Trivia/trivia.js
// ✅ Telegraf-compatible Trivia engine with player counter, button locking, and clean event handling

const { activeGames } = require("./state");
const { shuffleArray, formatQuestion } = require("./utils");
const { loadTopicQuestions, getAvailableTopics } = require("./topics");
const { setupTroll } = require("./troll");

const QUESTIONS_PER_GAME = 10;
const QUESTION_TIME = 15000; // 15 seconds
const BREAK_TIME = 3000;     // 3 seconds

function setupTrivia(bot) {
  // ===== /triviatopics =====
  bot.command("triviatopics", async (ctx) => {
    const topics = getAvailableTopics();
    let message = "📚 *Available Trivia Topics:*\n\n";
    topics.forEach((t, i) => {
      message += `${i + 1}. ${t.name}\n   _${t.description}_\n\n`;
    });
    message += "Use /trivia to start a game as an admin.";
    await ctx.reply(message, { parse_mode: "Markdown" });
  });

// ===== /trivia =====
bot.hears(/^\/trivia(@\w+)?$/, async (ctx) => {
  const chatId = ctx.chat.id;
  const userId = ctx.from.id;

  // Only admins can start trivia
  const admins = await ctx.telegram.getChatAdministrators(chatId);
  const isAdmin = admins.some(a => a.user.id === userId);
  if (!isAdmin) return ctx.reply("😼 Only group admins can start trivia.");

  if (activeGames[chatId]) {
    return ctx.reply("A trivia game is already running in this chat!");
  }

  // Prevent multiple /trivia waiting sessions
  if (activeGames[`pending_${chatId}`]) {
    return ctx.reply("❗ A trivia setup is already waiting for a topic number. Please reply with 1, 2, or 3.");
  }

  const topics = getAvailableTopics();
  let message = "📘 *Choose a trivia topic:*\n\n";
  topics.forEach((t, i) => {
    message += `${i + 1}. ${t.name}\n   _${t.description}_\n\n`;
  });
  message += "Reply with the topic number to start.";
  await ctx.reply(message, { parse_mode: "Markdown" });

  // Mark setup state
  activeGames[`pending_${chatId}`] = { userId, topics, started: Date.now() };
});

// ===== Capture topic replies =====
bot.on("text", async (ctx, next) => {
  const chatId = ctx.chat.id;
  const userId = ctx.from.id;
  const pending = activeGames[`pending_${chatId}`];
  if (!pending) return next();

  // Only accept from the admin who initiated /trivia
  if (pending.userId !== userId) return next();

  const index = parseInt(ctx.message.text.trim());
  if (isNaN(index) || index < 1 || index > pending.topics.length) {
    await ctx.reply("❌ Invalid selection. Try /trivia again.");
    delete activeGames[`pending_${chatId}`];
    return;
  }

  const selected = pending.topics[index - 1];
  console.log(`🎯 Trivia topic selected: ${selected.key}`);

  const questions = loadTopicQuestions(selected.key);
  if (!questions || !questions.length) {
    await ctx.reply("⚠️ Failed to load questions for this topic. Cancelling game.");
    delete activeGames[`pending_${chatId}`];
    return;
  }

  delete activeGames[`pending_${chatId}`]; // clear pending state
  await startTrivia(ctx, selected.key, userId);
});

  // ===== /triviaskip =====
  bot.command("triviaskip", (ctx) => {
    const chatId = ctx.chat.id;
    const userId = ctx.from.id;
    const game = activeGames[chatId];
    if (!game) return ctx.reply("No trivia game running here.");
    if (game.adminId !== userId)
      return ctx.reply("Only the admin who started the game can skip questions.");

    clearTimeout(game.timer);
    ctx.reply("⏭ Question skipped!");
    nextQuestion(ctx);
  });

  // ===== /triviaend =====
  bot.command("triviaend", (ctx) => {
    const chatId = ctx.chat.id;
    const userId = ctx.from.id;
    const game = activeGames[chatId];
    if (!game) return ctx.reply("No trivia game running here.");
    if (game.adminId !== userId)
      return ctx.reply("Only the admin who started the game can end it.");

    endTrivia(ctx, "Game ended early.");
  });

// ===== Handle button presses =====
bot.on("callback_query", async (ctx) => {
  try {
    const chatId = ctx.chat.id;
    const game = activeGames[chatId];
    if (!game) return ctx.answerCbQuery("❌ No trivia game running.");

    const userId = ctx.from.id;
    const choice = ctx.callbackQuery.data; // <-- proper Telegraf property

    // Prevent multiple answers
    if (game.answers[userId]) {
      return ctx.answerCbQuery("😼 You already answered this question!");
    }

    // Record player’s answer
    game.answers[userId] = choice;

    // Confirm response
    await ctx.answerCbQuery(`✅ Answer recorded: ${choice}`, { show_alert: false });

    // Disable buttons after they answer (optional but good UX)
    const messageId = ctx.callbackQuery.message.message_id;
    const updatedKeyboard = {
      inline_keyboard: [[
        { text: choice === "A" ? "🟢 A" : "A", callback_data: "A" },
        { text: choice === "B" ? "🟢 B" : "B", callback_data: "B" },
        { text: choice === "C" ? "🟢 C" : "C", callback_data: "C" },
        { text: choice === "D" ? "🟢 D" : "D", callback_data: "D" }
      ]]
    };

    // Edit the same message to show the locked-in buttons
    await ctx.telegram.editMessageReplyMarkup(chatId, messageId, null, updatedKeyboard);
  } catch (err) {
    console.error("⚠️ Trivia callback error:", err);
  }
});

  setupTroll(bot);
  console.log("🎲 /troll command linked to Trivia (Telegraf mode)");
}

// ===== Trivia Flow =====

async function startTrivia(ctx, topicKey, adminId) {
  const chatId = ctx.chat.id;
  const questions = loadTopicQuestions(topicKey);
  if (!questions || !questions.length) {
    console.warn(`⚠️ Trivia: No questions found for topic '${topicKey}'.`);
    delete activeGames[chatId];
    return ctx.reply("⚠️ Failed to load questions for this topic. Game cancelled.");
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
    messageLocked: false
  };

  const topicList = getAvailableTopics();
  const topic = topicList.find(t => t.key === topicKey);
  await ctx.reply(`🎯 Starting *${topic?.name || "Trivia"}*! Get ready...`, { parse_mode: "Markdown" });
  setTimeout(() => nextQuestion(ctx), 3000);
}

function nextQuestion(ctx) {
  const chatId = ctx.chat.id;
  const game = activeGames[chatId];
  if (!game) return;

  game.currentIndex++;
  game.answers = {};
  game.messageLocked = false;

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
      { text: "D", callback_data: "D" }
    ]]
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

  let message = `✅ Correct answer: *${correct}) ${correctText}*\n`;
  message += winners.length
    ? `🏅 ${winners.length} got it right!`
    : `😿 No correct answers this round.`;

  ctx.reply(message, { parse_mode: "Markdown" });
  setTimeout(() => nextQuestion(ctx), BREAK_TIME);
}

function endTrivia(ctx, note) {
  const chatId = ctx.chat.id;
  const game = activeGames[chatId];
  if (!game) return;

  const results = Object.entries(game.scores)
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score);

  let text = "🎉 *Trivia Results!*\n\n";
  if (!results.length) {
    text += "No points scored. Everyone needs a refresher! 😹";
  } else {
    results.forEach((r, i) => {
      text += `${i + 1}. [${r.id}]: ${r.score} points\n`;
    });

    if (results.length > 1 && results[0].score === results[1].score) {
      const top = results.filter(r => r.score === results[0].score);
      const names = top.map(r => `[${r.id}]`).join(" and ");
      text += `\n🤝 It's a tie between ${names}!\nUse /troll to settle it! 🎲`;
    }
  }

  if (note) text += `\n\n${note}`;
  ctx.reply(text, { parse_mode: "Markdown" });

  clearTimeout(game.timer);
  delete activeGames[chatId];
}

module.exports = { setupTrivia };
