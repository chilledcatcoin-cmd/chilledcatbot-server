/**
 * =====================================================
 * ChilledCatBot - Games - games.js
 * Handles game launches via callback queries & /commands
 * Version: 1.6.0
 * Date: 2025-10-09
 * =====================================================
 */

const GAMES = {
  flappycat: {
    title: "Flappy Cat",
    url: "https://chilledcatcoin-cmd.github.io/chilledcatbot/games/flappycat/flappycat.html",
    description: "Help Chilled Cat soar through pipes in this retro tribute to Flappy Bird!",
  },
  catsweeper: {
    title: "CatSweeper",
    url: "https://chilledcatcoin-cmd.github.io/chilledcatbot/games/catsweeper/catsweeper.html",
    description: "Classic minesweeper — but fluffier. Avoid the tuna bombs!",
  },
};

module.exports = { GAMES };
