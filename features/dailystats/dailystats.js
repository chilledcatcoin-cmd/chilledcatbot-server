/**
 * =====================================================
 * Chilled Cat Stats Engine (Core Logic)
 * =====================================================
 * Handles:
 *  - Fetching data from TONCenter, Dexscreener, X, Telegram
 *  - Reading/writing data in Redis
 *  - Formatting and posting messages
 * =====================================================
 */

const axios = require("axios");
const Redis = require("ioredis");

const Redis = require("ioredis");

const redis = new Redis(process.env.REDIS_URL, {
  tls: {},                        // ensures Upstash uses TLS
  reconnectOnError: () => true,   // always try to reconnect
  retryStrategy: (times) => Math.min(times * 200, 5000), // back-off reconnect
  maxRetriesPerRequest: null,     // keep trying
  enableReadyCheck: false,        // faster re-init
});

redis.on("error", (err) => {
  console.warn("[Redis] Connection warning:", err.message);
});
redis.on("connect", () => console.log("🔌 Redis connected"));
redis.on("reconnecting", () => console.log("♻️ Redis reconnecting..."));

const CHANNEL_ID = "@chilledcat";
const TOKEN_CA = "EQAwHA3KhihRIsKKWlJmw7ixrA3FJ4gZv3ialOZBVcl2Olpd";
const DEX_URL =
  "https://api.dexscreener.com/latest/dex/pairs/ton/eqaunzdf_szbp6b39_1gcddtatwnfabert8yupoct3wxgbdt";
const X_USER_ID = "1891578650074370048"; // @ChilledCatCoin

/* ------------------- Fetchers ------------------- */
async function getTonData() {
  const base = "https://toncenter.com/api/v2";
  const { data: info } = await axios.get(`${base}/getAddressInformation`, {
    params: { address: TOKEN_CA },
  });
  const { data: txs } = await axios.get(`${base}/getTransactions`, {
    params: { address: TOKEN_CA, limit: 100 },
  });
  const balanceTon = Number(info.result.balance) / 1e9;
  const txCount = txs.result?.length || 0;
  return { balanceTon, txCount };
}

async function getDexData() {
  const { data } = await axios.get(DEX_URL);
  const pair = data.pairs?.[0];
  if (!pair) throw new Error("No Dexscreener data found");
  return {
    priceUsd: parseFloat(pair.priceUsd),
    priceChange24h: parseFloat(pair.priceChange.h24),
    volume24hUsd: parseFloat(pair.volume.h24),
    liquidityUsd: parseFloat(pair.liquidity.usd),
  };
}

async function getXData() {
  const BEARER = process.env.X_BEARER;
  if (!BEARER) throw new Error("Missing X_BEARER token");
  const url = `https://api.x.com/2/users/${X_USER_ID}?user.fields=public_metrics`;
  const { data } = await axios.get(url, {
    headers: { Authorization: `Bearer ${BEARER}` },
  });
  return { followers: data.data.public_metrics.followers_count };
}

async function getTelegramData(bot) {
  const members = await bot.telegram.getChatMemberCount(CHANNEL_ID);
  return { telegramMembers: members };
}

/* ------------------- Redis Helpers ------------------- */
async function loadPrevData() {
  const raw = await redis.get("chilledcat:stats");
  return raw ? JSON.parse(raw) : {};
}
async function saveData(data) {
  data.timestamp = new Date().toISOString();
  await redis.set("chilledcat:stats", JSON.stringify(data));
}

/* ------------------- Helper Functions ------------------- */
function diff(curr, prev, label, suffix = "") {
  if (prev === undefined) return `${label}: ${curr}${suffix}`;
  const delta = curr - prev;
  const arrow = delta > 0 ? "📈" : delta < 0 ? "📉" : "⏸";
  const sign = delta > 0 ? "+" : "";
  return `${label}: ${curr}${suffix} (${arrow} ${sign}${delta.toFixed(2)}${suffix})`;
}
const fmtUTC = (d) => d.toISOString().replace("T", " ").split(".")[0] + " UTC";

/* ------------------- Main Post Function ------------------- */
async function postHourlyStats(bot) {
  try {
    const [ton, dex, x, tg] = await Promise.all([
      getTonData(),
      getDexData(),
      getXData(),
      getTelegramData(bot),
    ]);

    const prev = await loadPrevData();
    const now = new Date();
    const next = new Date(now.getTime() + 60 * 60 * 1000);

    const msg = `
🐾 *Chilled Cat Hourly Stats* 🐾

💰 ${diff(dex.priceUsd, prev.priceUsd, "Price", " USD")}
📉 ${diff(dex.priceChange24h, prev.priceChange24h, "24h Change", "%")}
📊 ${diff(dex.volume24hUsd, prev.volume24hUsd, "Volume (24h)", " USD")}
💦 ${diff(dex.liquidityUsd, prev.liquidityUsd, "Liquidity", " USD")}
💎 ${diff(ton.balanceTon, prev.balanceTon, "Treasury Balance", " TON")}
🧾 ${diff(ton.txCount, prev.txCount, "Recent TXs")}
👥 ${diff(tg.telegramMembers, prev.telegramMembers, "Telegram Members")}
🐦 ${diff(x.followers, prev.followers, "X Followers")}

⏰ *Last Updated:* ${fmtUTC(now)}
🕒 *Next Update:* ${fmtUTC(next)}
`;

    await bot.telegram.sendMessage(CHANNEL_ID, msg, { parse_mode: "Markdown" });
    await saveData({ ...ton, ...dex, ...x, ...tg });
    console.log(`✅ Stats updated at ${fmtUTC(now)}`);
  } catch (err) {
    console.error("❌ Stats update error:", err.message);
  }
}

module.exports = { postHourlyStats };
