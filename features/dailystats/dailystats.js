/**
 * =====================================================
 * Chilled Cat Stats Engine (Upstash + Telegram + Hyperlinks)
 * =====================================================
 *  - Dexscreener + TONCenter + TonViewer + X + Telegram
 *  - Cached API calls + Upstash persistence
 * =====================================================
 */

const axios = require("axios");
const { Redis } = require("@upstash/redis");
const { generateStatsCard } = require("./canvas");

// ✅ Upstash client (HTTP mode, no TCP)
const redis = new Redis({
  url: process.env.UPSTASH_URL,
  token: process.env.UPSTASH_TOKEN,
});
console.log("🔌 Using Upstash Redis HTTP client");

// ------------------- CONFIG -------------------
const CHANNEL_ID = "-4873969981";
const TELEGRAM_STATS_CHAT = "-4873969981";
const TOKEN_CA = "EQAwHA3KhihRIsKKWlJmw7ixrA3FJ4gZv3ialOZBVcl2Olpd";
const DEX_URL =
  "https://api.dexscreener.com/latest/dex/pairs/ton/eqaunzdf_szbp6b39_1gcddtatwnfabert8yupoct3wxgbdt";
const X_USER_ID = "1891578650074370048"; // @ChilledCatCoin
const TON_BASE = "https://toncenter.com/api/v2";

// ------------------- LINKS -------------------
const LINKS = {
  telegram: "https://t.me/ChilledCatCoin",
  x: "https://x.com/ChilledCatCoin",
  holders: `https://tonviewer.com/${TOKEN_CA}/holders`,
  dexscreener:
    "https://dexscreener.com/ton/eqaunzdf_szbp6b39_1gcddtatwnfabert8yupoct3wxgbdt",
};

// =====================================================
// 🧭 FETCHERS
// =====================================================

/**
 * TON + Holders data
 */
async function getTonData() {
  // --- Treasury TON balance ---
  const info = await axios.get(`${TON_BASE}/getAddressInformation`, {
    params: { address: TOKEN_CA },
  });
  const balanceTon = Number(info.data.result.balance) / 1e9;

  // --- Token holders count ---
  let holdersCount = 0;
  try {
    const url = `https://tonapi.io/v2/jettons/${TOKEN_CA}/holders`;
    console.log("🌐 Fetching holders from:", url);

    const headers = {};
    if (process.env.TONAPI_KEY) headers.Authorization = `Bearer ${process.env.TONAPI_KEY}`;

    const res = await axios.get(url, { headers });

    if (!res.data || typeof res.data.total === "undefined") {
      throw new Error("Invalid TonAPI response");
    }

    holdersCount = res.data.total;
    console.log(`✅ Holders fetched: ${holdersCount}`);
  } catch (err) {
    console.warn("⚠️ TonAPI holders fetch failed:", err.response?.data || err.message);

    // Fallback to cached holder count
    const cached = await redis.get("chilledcat:last_holders");
    holdersCount = cached ? Number(cached) : 0;
    if (holdersCount) console.log(`📦 Using cached holders: ${holdersCount}`);
  }

  // Cache the value
  await redis.set("chilledcat:last_holders", holdersCount);
  return { balanceTon, holdersCount };
}

/**
 * Dexscreener data with caching + fallback
 */
async function getDexData() {
  try {
    const { data } = await axios.get(DEX_URL);
    const pair = data.pairs?.[0];
    if (!pair) throw new Error("No Dexscreener data found");

    const result = {
      priceUsd: parseFloat(pair.priceUsd || 0),
      priceChange24h: parseFloat(pair?.priceChange?.h24 || 0),
      volume24hUsd: parseFloat(pair?.volume?.h24 || 0),
      liquidityUsd: parseFloat(pair?.liquidity?.usd || 0),
    };

    await redis.set("chilledcat:last_dex", JSON.stringify(result));
    return result;
  } catch (err) {
    console.warn("⚠️ Dexscreener fetch failed:", err.message);
    const cached = await redis.get("chilledcat:last_dex");
    if (cached) {
      console.log("📦 Using cached Dex data");
      return JSON.parse(cached);
    }
    return {
      priceUsd: 0,
      priceChange24h: 0,
      volume24hUsd: 0,
      liquidityUsd: 0,
    };
  }
}

/**
 * Telegram member count
 */
async function getTelegramData() {
  try {
    const url = `https://api.telegram.org/bot${process.env.BOT_TOKEN}/getChatMemberCount?chat_id=${TELEGRAM_STATS_CHAT}`;
    const { data } = await axios.get(url);
    if (!data.ok) throw new Error(JSON.stringify(data));
    return { telegramMembers: data.result || 0 };
  } catch (err) {
    console.warn("⚠️ Telegram member fetch failed:", err.response?.data || err.message);
    return { telegramMembers: 0 };
  }
}

/**
 * X / Twitter followers — cached to avoid rate limit 429
 */
let lastXCheck = 0;
async function getXData() {
  const now = Date.now();
  if (now - lastXCheck < 5 * 60 * 1000) {
    console.log("🕒 Skipping X fetch (cached <5m)");
    const cached = await redis.get("chilledcat:last_x_data");
    if (cached) return JSON.parse(cached);
  }

  try {
    const BEARER = process.env.X_BEARER;
    const url = `https://api.x.com/2/users/${X_USER_ID}?user.fields=public_metrics`;
    const { data } = await axios.get(url, {
      headers: { Authorization: `Bearer ${BEARER}` },
    });

    const result = { followers: data.data.public_metrics.followers_count };
    await redis.set("chilledcat:last_x_data", JSON.stringify(result));
    lastXCheck = now;
    return result;
  } catch (err) {
    console.warn("⚠️ X API fetch failed:", err.response?.data || err.message);
    const cached = await redis.get("chilledcat:last_x_data");
    if (cached) {
      console.log("📦 Using cached X data");
      return JSON.parse(cached);
    }
    return { followers: 0 };
  }
}

// =====================================================
// 🧱 REDIS HELPERS
// =====================================================
async function loadPrevData() {
  try {
    const raw = await redis.get("chilledcat:stats");
    if (!raw) return {};
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return {
      priceUsd: 0,
      priceChange24h: 0,
      volume24hUsd: 0,
      liquidityUsd: 0,
      balanceTon: 0,
      holdersCount: 0,
      telegramMembers: 0,
      followers: 0,
      ...parsed,
    };
  } catch (err) {
    console.error("⚠️ Redis load error:", err.message);
    return {};
  }
}

async function saveData(data) {
  try {
    data.timestamp = new Date().toISOString();
    const payload = JSON.stringify(data, null, 2);
    console.log("💾 Attempting to save to Upstash:\n", payload);

    const result = await redis.set("chilledcat:stats", payload);
    console.log("✅ Redis response:", result);
  } catch (err) {
    console.error("❌ Redis save error:", err.response?.data || err.message);
  }
}

// =====================================================
// 🧮 HELPERS
// =====================================================
function clean(value, decimals = 2) {
  if (value === null || isNaN(value)) return "—";
  return Number(value).toFixed(decimals);
}

function diff(curr, prev, label, suffix = "") {
  if (prev === undefined) return `${label}: ${clean(curr)}${suffix}`;
  const delta = curr - prev;
  if (isNaN(delta)) return `${label}: ${clean(curr)}${suffix}`;
  const arrow = delta > 0 ? "📈" : delta < 0 ? "📉" : "⏸️";
  const sign = delta > 0 ? "+" : "";
  return `${label}: ${clean(curr)}${suffix} (${arrow} ${sign}${clean(delta)}${suffix})`;
}

const fmtUTC = (d) => d.toISOString().replace("T", " ").split(".")[0] + " UTC";

// =====================================================
// 🚀 MAIN FUNCTION
// =====================================================//

async function postHourlyStats(bot) {
  try {
    console.log("🚀 Fetching all Chilled Cat stats...");
    const [ton, dex, x, tg] = await Promise.all([
      getTonData(),
      getDexData(),
      getXData(),
      getTelegramData(),
    ]);

    const prev = await loadPrevData();
    const now = new Date();
    const next = new Date(now.getTime() + 60 * 60 * 1000);

    // ✅ Save latest snapshot (no treasury)
    const statsData = {
      holdersCount: ton.holdersCount,
      ...dex,
      ...x,
      ...tg,
    };
    await saveData(statsData);

    // ✅ Generate the canvas snapshot image
    const imgPath = await generateStatsCard({
      ...statsData,
      timestamp: now.toISOString(),
    });

    // ✅ Build caption with clickable links
    const caption = `
🐾 [Chilled Cat Hourly Stats](https://chilledcatcoin.com)

💰 [Price: ${dex.priceUsd.toFixed(6)} USD](${LINKS.dexscreener})
🐾 [Token Holders: ${ton.holdersCount}](${LINKS.holders})
👥 [Telegram Members: ${tg.telegramMembers}](${LINKS.telegram})
🐦 [X Followers: ${x.followers}](${LINKS.x})

⏰ *Last Updated:* ${fmtUTC(now)}
🕒 *Next Update:* ${fmtUTC(next)}
`;

    await bot.telegram.sendPhoto(
      CHANNEL_ID,
      { source: imgPath },
      { caption, parse_mode: "Markdown" }
    );

    console.log(`✅ Stats image posted successfully at ${fmtUTC(now)}`);
  } catch (err) {
    console.error("❌ Stats update error:", err.message);
  }
}

module.exports = { postHourlyStats };
