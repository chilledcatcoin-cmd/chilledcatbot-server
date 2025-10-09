/**
 * =====================================================
 * ChilledCatBot - Games Registry
 * =====================================================
 */

const BASE_URL = "https://chilledcatcoin-cmd.github.io/chilledcatbot/games";

const GAMES = {
  flappycat: {
    title: "Flappy Cat — A Chilled Cat Game",
    url: `${BASE_URL}/flappycat/flappycat.html`,
  },
  catsweeper: {
    title: "CatSweeper ’97 — Minesweeper with Cats",
    url: `${BASE_URL}/catsweeper/catsweeper.html`,
  },
};

function listGames() {
  return Object.entries(GAMES)
    .map(([key, g]) => `🎮 *${g.title}*\n[Play Now](${g.url})`)
    .join("\n\n");
}

module.exports = { GAMES, listGames };
