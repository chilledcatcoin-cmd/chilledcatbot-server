// /modules/Trivia/topics.js
// ✅ Loads .js question modules directly

const ton = require("./trivia_ton");

const topics = [
  {
    key: "ton",
    name: "TON Trivia",
    description: "Test your knowledge of The Open Network, Toncoin, and Telegram ecosystem!",
    questions: ton
  },
  {
    key: "crypto",
    name: "General Crypto Trivia",
    description: "Bitcoin, Ethereum, DeFi, NFTs and more.",
    questions: [] // placeholder for now
  },
  {
    key: "chilledcat",
    name: "Chilled Cat Lore",
    description: "Dive into the Chilled Cat universe — stickers, lore, and 90s nostalgia!",
    questions: [] // placeholder for now
  }
];

function loadTopicQuestions(key) {
  const topic = topics.find(t => t.key === key);
  if (!topic) {
    console.warn("⚠️ Invalid topic key:", key);
    return [];
  }
  console.log(`🎯 Loading questions for topic: ${topic.name} (${key})`);
  return topic.questions || [];
}

function getAvailableTopics() {
  return topics;
}

module.exports = { loadTopicQuestions, getAvailableTopics };
