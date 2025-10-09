// /modules/Trivia/utils.js
function shuffleArray(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

function formatQuestion(q, index) {
  const letters = ["A", "B", "C", "D"];
  let text = `❓ *Question ${index}:*\n${q.question}\n\n`;
  q.options.forEach((opt, i) => {
    text += `${letters[i]}) ${opt}\n`;
  });
  return { text, options: q.options };
}

module.exports = { shuffleArray, formatQuestion };
