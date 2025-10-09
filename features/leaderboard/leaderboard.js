/**
 * =====================================================
 * ChilledCatBot - Leaderboard Manager
 * =====================================================
 */

const axios = require("axios");

const PLAYFAB_TITLE_ID = process.env.PLAYFAB_TITLE_ID;
const PLAYFAB_DEV_SECRET = process.env.PLAYFAB_DEV_SECRET;
const CACHE_TTL = 30000; // 30 seconds

const cache = new Map();

function getStatName(type, game, id = "") {
  switch (type) {
    case "global": return `${game}_global`;
    case "group":  return `${game}_group_${id}`;
    case "contest": return `${game}_contest_${id}`;
    default: return `${game}_${type}`;
  }
}

async function getLeaderboardCached(statName) {
  const cached = cache.get(statName);
  if (cached && (Date.now() - cached.ts < CACHE_TTL)) {
    return cached.data;
  }

  const resp = await axios.post(
    `https://${PLAYFAB_TITLE_ID}.playfabapi.com/Server/GetLeaderboard`,
    {
      StatisticName: statName,
      StartPosition: 0,
      MaxResultsCount: 10,
    },
    { headers: { "X-SecretKey": PLAYFAB_DEV_SECRET } }
  );

  const list = resp.data.data.Leaderboard || [];
  cache.set(statName, { ts: Date.now(), data: list });
  return list;
}

module.exports = { getLeaderboardCached, getStatName };
