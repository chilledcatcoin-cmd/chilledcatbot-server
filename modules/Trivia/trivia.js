// /modules/Trivia/index.js
//
// Trivia module entry point — registers commands and initializes the trivia engine.
// Uses topic loader from topics.js for multi-category trivia support.
//

const { activeGames } = require("./state");
const { shuffleArray, formatQuestion } = require("./utils");
const { loadTopicQuestions, getAvailableTopics } = require("./topics");

const QUESTIONS_PER_GAME = 10;
const QUESTION_TIME = 15000; // 15 seconds
const BREAK_TIME = 3000;     // 3 seconds

function setupTrivia(bot) {
  // ===== Command: /triviatopics =====
  bot.onText(/^\/triviatopics$/, (msg) => {
    const chatId = msg.chat.id;
    const topics = getAvailableTopics();

    let message = "📚 *Available Trivia Topics:*\n\n";
    topics.forEach((t, i) => {
      message += `${i + 1}. ${t.name}\n   _${t.description}_\n\n`;
    });
    message += "Use /trivia to start a game as an admin.";

    bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
  });

  // ===== Command: /trivia =====
  bot.onText(/^\/trivia$/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // Only admins can start trivia
    const admins = await bot.getChatAdministrators(chatId);
    const isAdmin = admins.some(a => a.user.id === userId);
    if (!isAdmin) return bot.sendMessage(chatId, "😼 Only group admins can start trivia.");

    if (activeGames[chatId]) {
      return bot.sendMessage(chatId, "A trivia game is already running in this chat!");
    }

    // Show available topics
    const topics = getAvailableTopics();
    let message = "📘 *Choose a trivia topic:*\n\n";
    topics.forEach((t, i) => {
      message += `${i + 1}. ${t.name}\n   _${t.description}_\n\n`;
    });
    message += "Reply with the topic number to start.";

    bot.sendMessage(chatId, message, { parse_mode: "Markdown" });

    // Wait for admin reply with topic number
    bot.once("message", async (reply) => {
      if (reply.chat.id !== chatId || reply.from.id !== userId) return;
      const index = parseInt(reply.text?.trim());
      if (isNaN(index) || index < 1 || index > topics.length) {
        return bot.sendMessage(chatId, "❌ Invalid selection. Try /trivia again.");
      }

      const topicKey = Object.keys(getAvailableTopics())[index - 1];
      startTrivia(chatId, bot, topicKey, userId);
    });
  });

  // ===== Command: /triviaskip =====
  bot.onText(/^\/triviaskip$/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const game = activeGames[chatId];

    if (!game) return bot.sendMessage(chatId, "No trivia game running here.");
    if (game.adminId !== userId)
      return bot.sendMessage(chatId, "Only the admin who started the game can skip questions.");

    clearTimeout(game.timer);
    bot.sendMessage(chatId, "⏭ Question skipped!");
    nextQuestion(chatId, bot);
  });

  // ===== Command: /triviaend =====
  bot.onText(/^\/triviaend$/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const game = activeGames[chatId];

    if (!game) return bot.sendMessage(chatId, "No trivia game running here.");
    if (game.adminId !== userId)
      return bot.sendMessage(chatId, "Only the admin who started the game can end it.");

    endTrivia(chatId, bot, "Game ended early.");
  });

  // ===== Handle answer button presses =====
  bot.on("callback_query", (query) => {
    const chatId = query.message.chat.id;
    const game = activeGames[chatId];
    if (!game) return;

    const userId = query.from.id;
    const choice = query.data;

    if (game.answers[userId]) {
      return bot.answerCallbackQuery(query.id, { text: "You already answered!" });
    }

    game.answers[userId] = choice;
    bot.answerCallbackQuery(query.id, { text: `Answer recorded: ${choice}` });
  });

  // 🧩 Add this line to register /troll command when Trivia loads
  const { setupTroll } = require("./troll");
  setupTroll(bot);
  console.log("🎲 /troll command linked to Trivia module");
}

function startTrivia(chatId, bot, topicKey, adminId) {
  const questions = loadTopicQuestions(topicKey);
  if (!questions.length) {
    return bot.sendMessage(chatId, "⚠️ Failed to load questions for this topic.");
  }

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

  const topicList = getAvailableTopics();
  const topic = topicList.find(t => t.key === topicKey);
  bot.sendMessage(chatId, `🎯 Starting *${topic?.name || "Trivia"}*! Get ready...`, { parse_mode: "Markdown" });
  setTimeout(() => nextQuestion(chatId, bot), 3000);
}

function nextQuestion(chatId, bot) {
  const game = activeGames[chatId];
  if (!game) return;

  game.currentIndex++;
  game.answers = {};

  if (game.currentIndex >= game.questions.length) {
    return endTrivia(chatId, bot);
  }

  const q = game.questions[game.currentIndex];
  const { text } = formatQuestion(q, game.currentIndex + 1);

  const keyboard = {
    inline_keyboard: [
      [
        { text: "A", callback_data: "A" },
        { text: "B", callback_data: "B" },
        { text: "C", callback_data: "C" },
        { text: "D", callback_data: "D" }
      ]
    ]
  };

  bot.sendMessage(chatId, text, { reply_markup: keyboard, parse_mode: "Markdown" });
  game.timer = setTimeout(() => checkAnswers(chatId, bot), QUESTION_TIME);
}

function checkAnswers(chatId, bot) {
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
  if (winners.length) {
    message += `🏅 ${winners.length} got it right!`;
  } else {
    message += `😿 No correct answers this round.`;
  }

  bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
  setTimeout(() => nextQuestion(chatId, bot), BREAK_TIME);
}

function endTrivia(chatId, bot, note) {
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

    // Detect ties
    if (results.length > 1 && results[0].score === results[1].score) {
      const top = results.filter(r => r.score === results[0].score);
      const names = top.map(r => `[${r.id}]`).join(" and ");
      text += `\n🤝 It's a tie between ${names}!\nUse /troll to settle it! 🎲\nMay the chillest cat win 😼`;
    }
  }

  if (note) text += `\n\n${note}`;
  bot.sendMessage(chatId, text, { parse_mode: "Markdown" });

  clearTimeout(game.timer);
  delete activeGames[chatId];
}

module.exports = { setupTrivia };
