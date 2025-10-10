/**
 * =====================================================
 * Chilled Cat Stats Engine (Upstash + Telegram)
 * =====================================================
 */

const axios = require("axios");
const { Redis } = require("@upstash/redis");

// ✅ Initialize Upstash Redis (HTTP, not TCP)
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

// ------------------- FETCHERS -------------------
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

async function getTelegramData() {
  try {
    const url = `https://api.telegram.org/bot${process.env.BOT_TOKEN}/getChatMemberCount?chat_id=${TELEGRAM_STATS_CHAT}`;
    const { data } = await axios.get(url);
    if (!data.ok) throw new Error(JSON.stringify(data));
    return { telegramMembers: data.result };
  } catch (err) {
    console.warn("⚠️ Telegram member fetch failed:", err.response?.data || err.message);
    return { telegramMembers: 0 };
  }
}

// ------------------- REDIS HELPERS -------------------
async function loadPrevData() {
  try {
    const raw = await redis.get("chilledcat:stats");
    if (!raw) return {};
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch (err) {
    console.error("⚠️ Redis load error:", err.message);
    return {};
  }
}

async function saveData(data) {
  try {
    data.timestamp = new Date().toISOString();
    console.log("💾 Saving stats to Upstash...");
    const result = await redis.set("chilledcat:stats", JSON.stringify(data));
    console.log("✅ Upstash set result:", result);
  } catch (err) {
    console.error("❌ Upstash save error:", err.message);
  }
}

// ------------------- HELPERS -------------------
function diff(curr, prev, label, suffix = "") {
  if (prev === undefined) return `${label}: ${curr}${suffix}`;
  const delta = curr - prev;
  const arrow = delta > 0 ? "📈" : delta < 0 ? "📉" : "⏸";
  const sign = delta > 0 ? "+" : "";
  return `${label}: ${curr}${suffix} (${arrow} ${sign}${delta.toFixed(2)}${suffix})`;
}

const fmtUTC = (d) => d.toISOString().replace("T", " ").split(".")[0] + " UTC";

// ------------------- MAIN FUNCTION -------------------
async function postHourlyStats(bot) {
  try {
    const dex = await getDexData();
    const tg = await getTelegramData();
    const prev = await loadPrevData();

    const now = new Date();
    const next = new Date(now.getTime() + 60 * 60 * 1000);

    const msg = `
🐾 *Chilled Cat Hourly Stats* 🐾

💰 ${diff(dex.priceUsd, prev.priceUsd, "Price", " USD")}
📉 ${diff(dex.priceChange24h, prev.priceChange24h, "24 h Change", "%")}
📊 ${diff(dex.volume24hUsd, prev.volume24hUsd, "Volume (24 h)", " USD")}
💦 ${diff(dex.liquidityUsd, prev.liquidityUsd, "Liquidity", " USD")}
👥 ${diff(tg.telegramMembers, prev.telegramMembers, "Telegram Members")}

⏰ *Last Updated:* ${fmtUTC(now)}
🕒 *Next Update:* ${fmtUTC(next)}
`;

    await saveData({ ...dex, ...tg });
    await bot.telegram.sendMessage(CHANNEL_ID, msg, { parse_mode: "Markdown" });
    console.log(`✅ Stats updated at ${fmtUTC(now)}`);
  } catch (err) {
    console.error("❌ Stats update error:", err.message);
  }
}

module.exports = { postHourlyStats };
