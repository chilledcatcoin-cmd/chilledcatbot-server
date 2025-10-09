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

/* -------------------------------
   Utility: Get Stat Name
   ------------------------------- */
function getStatName(type, game, id = "") {
  switch (type) {
    case "global":
      return `${game}_global`;
    case "group":
      return `${game}_group_${id}`;
    case "contest":
      // 🧠 Fix: if the ID already contains "contest_", return it directly
      return id && id.includes("contest_") ? id : `${game}_contest_${id}`;
    default:
      return `${game}_${type}`;
  }
}

/* -------------------------------
   Fetch Leaderboard (Cached)
   ------------------------------- */
async function getLeaderboardCached(statName, forceRefresh = false) {
  const cached = cache.get(statName);
  if (cached && !forceRefresh && (Date.now() - cached.ts < CACHE_TTL)) {
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


/* -------------------------------
   Record Player Score
   ------------------------------- */
async function recordScore(user, game, score, type = "global", id = "") {
  try {
    const statName = getStatName(type, game, id);
    const displayName = user.first_name || user.username || "Anonymous";

    await axios.post(
      `https://${PLAYFAB_TITLE_ID}.playfabapi.com/Server/UpdatePlayerStatistics`,
      {
        PlayFabId: user.playFabId, // should be set when user logs in / links
        Statistics: [{ StatisticName: statName, Value: score }],
      },
      { headers: { "X-SecretKey": PLAYFAB_DEV_SECRET } }
    );

    console.log(`💾 Saved ${displayName}'s ${game} score: ${score} (${statName})`);
  } catch (err) {
    console.error("⚠️ Failed to record score:", err?.response?.data || err);
  }
}

/* -------------------------------
   Exports
   ------------------------------- */
module.exports = { getLeaderboardCached, getStatName, recordScore };

