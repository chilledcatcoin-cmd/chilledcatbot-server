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

  // Show topics
  const topics = getAvailableTopics();
  let message = "📘 *Choose a trivia topic:*\n\n";
  topics.forEach((t, i) => {
    message += `${i + 1}. ${t.name}\n   _${t.description}_\n\n`;
  });
  message += "Reply with the topic number to start.";
  await ctx.reply(message, { parse_mode: "Markdown" });

  // One-time listener for the admin’s reply
  const onMessage = async (replyCtx) => {
    try {
      // Ignore messages from others or other chats
      if (replyCtx.chat.id !== chatId || replyCtx.from.id !== userId) return;

      const text = replyCtx.message?.text?.trim();
      const index = parseInt(text);
      if (isNaN(index) || index < 1 || index > topics.length) {
        await replyCtx.reply("❌ Invalid selection. Try /trivia again.");
        bot.off("message", onMessage);
        return;
      }

      const selected = topics[index - 1];
      console.log(`🎯 Trivia topic selected: ${selected.key}`);

      const questions = loadTopicQuestions(selected.key);
      if (!questions || !questions.length) {
        await replyCtx.reply("⚠️ Failed to load questions for this topic. Cancelling game.");
        delete activeGames[chatId];
        bot.off("message", onMessage);
        return;
      }

      await startTrivia(replyCtx, selected.key, userId);
    } finally {
      // Always clean up listener after any outcome
      bot.off("message", onMessage);
    }
  };

  bot.on("message", onMessage);
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
      const chatId = ctx.callbackQuery.message.chat.id;
      const game = activeGames[chatId];
      if (!game) return ctx.answerCbQuery("No active trivia game.");

      const userId = ctx.from.id;
      const choice = ctx.callbackQuery.data;

      if (choice === "ignore") return ctx.answerCbQuery();

      if (game.answers[userId]) {
        return ctx.answerCbQuery("😺 You already answered!");
      }

      // Record answer
      game.answers[userId] = choice;
      await ctx.answerCbQuery(`✅ Answer recorded: ${choice}`);

      // Update question with player count
      const q = game.questions[game.currentIndex];
      const { text } = formatQuestion(q, game.currentIndex + 1);
      const answeredCount = Object.keys(game.answers).length;

      const lockedKeyboard = {
        inline_keyboard: [[
          { text: choice === "A" ? "✅ A" : "A", callback_data: "ignore" },
          { text: choice === "B" ? "✅ B" : "B", callback_data: "ignore" },
          { text: choice === "C" ? "✅ C" : "C", callback_data: "ignore" },
          { text: choice === "D" ? "✅ D" : "D", callback_data: "ignore" }
        ]]
      };

      // Only first responder triggers lock edit
      if (!game.messageLocked) {
        game.messageLocked = true;
        await ctx.editMessageText(
          `${text}\n\n🕓 ${answeredCount} player${answeredCount === 1 ? "" : "s"} answered...`,
          { reply_markup: lockedKeyboard, parse_mode: "Markdown" }
        );
      } else {
        // Just update count silently
        await ctx.editMessageReplyMarkup(lockedKeyboard);
      }
    } catch (err) {
      console.error("⚠️ Trivia callback error:", err);
      ctx.answerCbQuery("⚠️ Something went wrong.");
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
