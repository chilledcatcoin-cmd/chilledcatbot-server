// /modules/Trivia/trivia.js
// ✅ Telegraf 4.x compatible Trivia Engine (Per-Player Mode)

const { activeGames } = require("./state");
const { shuffleArray, formatQuestion } = require("./utils");
const { loadTopicQuestions, getAvailableTopics } = require("./topics");
const { setupTroll } = require("./troll");

const QUESTIONS_PER_GAME = 10;
const QUESTION_TIME = 15000; // 15 seconds
const BREAK_TIME = 3000;     // 3 seconds

function setupTrivia(bot) {
  console.log("🎮 Initializing Trivia module...");

  // ===== Handle player answers (A/B/C/D buttons) =====
  bot.action(/^[ABCD]$/, async (ctx) => {
    try {
      const chatId = ctx.callbackQuery.message.chat.id;
      const userId = ctx.from.id;
      const choice = ctx.match[0];
      const game = activeGames[chatId];
      if (!game) return ctx.answerCbQuery("❌ No trivia game running.");

      // Prevent duplicate answers per player
      if (game.answers[userId]) {
        return ctx.answerCbQuery("😼 You already answered!");
      }

      // Record the player's choice
      game.answers[userId] = choice;
      console.log(`🎯 ${ctx.from.username || userId} answered ${choice}`);
      await ctx.answerCbQuery(`✅ Answer recorded: ${choice}`);

    } catch (err) {
      console.error("⚠️ Trivia callback error:", err);
      ctx.answerCbQuery("⚠️ Error handling your answer");
    }
  });

  // ===== Ignore disabled callbacks =====
  bot.action("ignore", async (ctx) => {
    await ctx.answerCbQuery("😺 You already answered!");
  });

  // ===== /triviatopics =====
  bot.command("triviatopics", async (ctx) => {
    const topics = getAvailableTopics();
    let msg = "📚 *Available Trivia Topics:*\n\n";
    topics.forEach((t, i) => {
      msg += `${i + 1}. ${t.name}\n   _${t.description}_\n\n`;
    });
    msg += "Use /trivia to start a game as an admin.";
    await ctx.reply(msg, { parse_mode: "Markdown" });
  });

  // ===== /trivia =====
  bot.command("trivia", async (ctx) => {
    const chatId = ctx.chat.id;
    const userId = ctx.from.id;

    const admins = await ctx.telegram.getChatAdministrators(chatId);
    const isAdmin = admins.some(a => a.user.id === userId);
    if (!isAdmin) return ctx.reply("😼 Only group admins can start trivia.");

    if (activeGames[chatId]) {
      return ctx.reply("A trivia game is already running here!");
    }

    const topics = getAvailableTopics();
    let msg = "📘 *Choose a trivia topic:*\n\n";
    topics.forEach((t, i) => {
      msg += `${i + 1}. ${t.name}\n   _${t.description}_\n\n`;
    });
    msg += "Reply with the topic number to start.";
    await ctx.reply(msg, { parse_mode: "Markdown" });

    // Wait for admin's reply once
    const handler = async (replyCtx) => {
      if (replyCtx.chat.id !== chatId || replyCtx.from.id !== userId) return;

      const index = parseInt(replyCtx.message?.text?.trim());
      const topicsArr = getAvailableTopics();
      if (isNaN(index) || index < 1 || index > topicsArr.length) {
        await ctx.reply("❌ Invalid selection. Try /trivia again.");
        bot.removeListener("message", handler);
        return;
      }

      const topic = topicsArr[index - 1];
      console.log(`🎯 Trivia topic selected: ${topic.key}`);
      const questions = loadTopicQuestions(topic.key);
      if (!questions || !questions.length) {
        await ctx.reply("⚠️ Failed to load questions for this topic. Cancelling game.");
        delete activeGames[chatId];
        bot.removeListener("message", handler);
        return;
      }

      bot.removeListener("message", handler);
      await startTrivia(replyCtx, topic.key, userId);
    };

    bot.on("message", handler);
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
    ctx.reply("⏭ Skipping current question...");
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

  setupTroll(bot);
  console.log("🎲 Trivia + /troll ready (Per-Player Mode)");
}

// ===== GAME LOGIC =====

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
    timer: null
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
