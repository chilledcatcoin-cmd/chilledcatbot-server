// /modules/Trivia/trivia.js
// ✅ Telegraf-compatible Trivia engine (stable topic selection + solid button handling)

const { activeGames } = require("./state");
const { shuffleArray, formatQuestion } = require("./utils");
const { loadTopicQuestions, getAvailableTopics } = require("./topics");
const { setupTroll } = require("./troll");

const QUESTIONS_PER_GAME = 10;
const QUESTION_TIME = 15000; // 15s to answer
const BREAK_TIME = 3000;     // 3s between questions

function setupTrivia(bot) {
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

  // ===== /trivia ===== (admin-only; uses pending state — no dynamic unbinds)
  bot.hears(/^\/trivia(@\w+)?$/, async (ctx) => {
    const chatId = ctx.chat.id;
    const userId = ctx.from.id;

    // Only admins can start
    const admins = await ctx.telegram.getChatAdministrators(chatId);
    const isAdmin = admins.some(a => a.user.id === userId);
    if (!isAdmin) return ctx.reply("😼 Only group admins can start trivia.");

    // Block if a game already runs
    if (activeGames[chatId]) {
      return ctx.reply("A trivia game is already running in this chat!");
    }

    // Prevent parallel topic prompts
    if (activeGames[`pending_${chatId}`]) {
      return ctx.reply("❗ A trivia setup is already waiting for a topic number. Reply with 1, 2, or 3.");
    }

    const topics = getAvailableTopics();
    let message = "📘 *Choose a trivia topic:*\n\n";
    topics.forEach((t, i) => {
      message += `${i + 1}. ${t.name}\n   _${t.description}_\n\n`;
    });
    message += "Reply with the topic number to start.";
    await ctx.reply(message, { parse_mode: "Markdown" });

    // Mark pending selection for this chat (who can answer + list of topics)
    activeGames[`pending_${chatId}`] = { userId, topics, started: Date.now() };
  });

  // ===== Capture the topic reply (only from the initiating admin) =====
  bot.on("text", async (ctx, next) => {
    const chatId = ctx.chat.id;
    const userId = ctx.from.id;
    const pending = activeGames[`pending_${chatId}`];
    if (!pending) return next(); // nothing pending in this chat

    if (pending.userId !== userId) return next(); // only the admin who ran /trivia

    const idx = parseInt((ctx.message.text || "").trim(), 10);
    if (Number.isNaN(idx) || idx < 1 || idx > pending.topics.length) {
      await ctx.reply("❌ Invalid selection. Try /trivia again.");
      delete activeGames[`pending_${chatId}`];
      return;
    }

    const selected = pending.topics[idx - 1];
    console.log(`🎯 Trivia topic selected: ${selected.key}`);

    const questions = loadTopicQuestions(selected.key);
    if (!questions || !questions.length) {
      await ctx.reply("⚠️ Failed to load questions for this topic. Cancelling game.");
      delete activeGames[`pending_${chatId}`];
      return;
    }

    delete activeGames[`pending_${chatId}`];
    await startTrivia(ctx, selected.key, userId);
  });

  // ===== /triviaskip (admin who started) =====
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

  // ===== /triviaend (admin who started) =====
  bot.command("triviaend", (ctx) => {
    const chatId = ctx.chat.id;
    const userId = ctx.from.id;
    const game = activeGames[chatId];
    if (!game) return ctx.reply("No trivia game running here.");
    if (game.adminId !== userId)
      return ctx.reply("Only the admin who started the game can end it.");

    endTrivia(ctx, "Game ended early.");
  });

  // ===== Answer buttons (Telegraf-native) =====
  bot.action(/^(A|B|C|D)$/, async (ctx) => {
    try {
      const chatId = ctx.callbackQuery.message.chat.id;
      const game = activeGames[chatId];
      if (!game) return ctx.answerCbQuery("❌ No trivia game running.");

      const userId = ctx.from.id;
      const choice = ctx.match[0]; // 'A' | 'B' | 'C' | 'D'

      // Block multiple answers per user
      if (game.answers[userId]) {
        return ctx.answerCbQuery("😼 You already answered!");
      }

      // Record and confirm
      game.answers[userId] = choice;
      await ctx.answerCbQuery(`✅ Answer recorded: ${choice}`);

      // (Important) Do NOT edit the message here — allow *everyone* to answer
      // Users who try again will get the "already answered" toast.
    } catch (err) {
      console.error("⚠️ Trivia callback error:", err);
      ctx.answerCbQuery("⚠️ Error handling your answer");
    }
  });

  // Optional no-op to swallow any disabled buttons if you ever use them
  bot.action("ignore", (ctx) => ctx.answerCbQuery());

  // ===== /troll =====
  setupTroll(bot);
  console.log("🎲 /troll command linked to Trivia (Telegraf mode)");
}

/* ========= Trivia Flow ========= */

async function startTrivia(ctx, topicKey, adminId) {
  const chatId = ctx.chat.id;
  const questions = loadTopicQuestions(topicKey);
  if (!questions || !questions.length) {
    console.warn(`⚠️ Trivia: No questions found for topic '${topicKey}'.`);
    delete activeGames[chatId];
    return ctx.reply("⚠️ Failed to load questions for this topic. Game cancelled.");
  }

  console.log(`✅ Loaded ${questions.length} questions for topic '${topicKey}'`);
  const subset = shuffleArray(questions).slice(0, QUESTIONS_PER_GAME);

  activeGames[chatId] = {
    topic: topicKey,
    questions: subset,
    currentIndex: -1,
    scores: {},
    answers: {},
    adminId,
    timer: null
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
  game.answers = {}; // reset answer map for this question

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
    : `😺 No correct answers this round.`;

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

  // Tie?
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
