// /modules/Trivia/topics.js
//
// This module defines available trivia topics and
// dynamically loads the correct question set.
//
// Add new topics by creating new files like:
//   trivia_crypto.js, trivia_cats.js, trivia_memes.js
// and registering them in the topics list below.
//

const path = require("path");

const topics = {
  ton: {
    name: "TON Trivia",
    file: path.join(__dirname, "trivia_ton.js"),
    description: "Test your knowledge of The Open Network, Toncoin, and Telegram ecosystem!"
  },

  // Example placeholders for future topics:
  crypto: {
    name: "General Crypto Trivia",
    file: path.join(__dirname, "trivia_crypto.js"),
    description: "Bitcoin, Ethereum, DeFi, NFTs and more."
  },

  chilledcat: {
    name: "Chilled Cat Lore",
    file: path.join(__dirname, "trivia_cat.js"),
    description: "Dive into the Chilled Cat universe — stickers, lore, and 90s nostalgia!"
  }
};

/**
 * Load questions for the selected topic.
 * Returns [] if topic not found or file missing.
 */
function loadTopicQuestions(topicKey) {
  const topic = topics[topicKey];
  if (!topic) return [];

  try {
    const data = require(topic.file);
    if (!Array.isArray(data)) throw new Error("Invalid trivia data format");
    return data;
  } catch (err) {
    console.error(`⚠️ Failed to load trivia topic: ${topicKey}`, err);
    return [];
  }
}

/**
 * Return a list of available trivia topics.
 */
function getAvailableTopics() {
  return Object.keys(topics).map(key => ({
    key,
    name: topics[key].name,
    description: topics[key].description
  }));
}

module.exports = { loadTopicQuestions, getAvailableTopics };
