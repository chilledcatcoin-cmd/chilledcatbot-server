/**
 * =====================================================
 * Chilled Cat Stats Engine (Upstash + Telegram + Hyperlinks)
 * =====================================================
 *  - Dexscreener + TONCenter + TonViewer + X (scraper) + Telegram (scraper)
 *  - Cached API calls + Upstash persistence
 *  - No external API tokens required for X/Telegram
 * =====================================================
 */

const axios = require("axios");
const { Redis } = require("@upstash/redis");
const { generateStatsCard } = require("./canvas");

// ✅ Upstash client (HTTP mode)
const redis = new Redis({
  url: process.env.UPSTASH_URL,
  token: process.env.UPSTASH_TOKEN,
});
console.log("🔌 Using Upstash Redis HTTP client");

// ------------------- CONFIG -------------------
const CHANNEL_ID = "-4873969981"; // target group/channel
const TOKEN_CA = "EQAwHA3KhihRIsKKWlJmw7ixrA3FJ4gZv3ialOZBVcl2Olpd";
const DEX_URL =
  "https://api.dexscreener.com/latest/dex/pairs/ton/eqaunzdf_szbp6b39_1gcddtatwnfabert8yupoct3wxgbdt";
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
  const info = await axios.get(`${TON_BASE}/getAddressInformation`, {
    params: { address: TOKEN_CA },
  });
  const balanceTon = Number(info.data.result.balance) / 1e9;

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
    const cached = await redis.get("chilledcat:last_holders");
    holdersCount = cached ? Number(cached) : 0;
    if (holdersCount) console.log(`📦 Using cached holders: ${holdersCount}`);
  }

  await redis.set("chilledcat:last_holders", String(holdersCount));
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

    await redis.set("chilledcat:last_dex", Object.entries(result).map(([k, v]) => `${k}:${v}`).join(";"));
    return result;
  } catch (err) {
    console.warn("⚠️ Dexscreener fetch failed:", err.message);
    const cached = await redis.get("chilledcat:last_dex");
    if (cached) {
      console.log("📦 Using cached Dex data");
      const obj = Object.fromEntries(
        cached.split(";").map(p => p.split(":")).filter(a => a.length === 2)
      );
      return {
        priceUsd: parseFloat(obj.priceUsd || 0),
        priceChange24h: parseFloat(obj.priceChange24h || 0),
        volume24hUsd: parseFloat(obj.volume24hUsd || 0),
        liquidityUsd: parseFloat(obj.liquidityUsd || 0),
      };
    }
    return { priceUsd: 0, priceChange24h: 0, volume24hUsd: 0, liquidityUsd: 0 };
  }
}

// =====================================================
// 👥 Telegram Scraper
// =====================================================
async function getTelegramData() {
  try {
    const url = LINKS.telegram;
    const { data } = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36",
      },
    });

    const match = data.match(/(\d+(?:,\d+)*)\s+members/);
    if (match) {
      const telegramMembers = parseInt(match[1].replace(/,/g, ""));
      console.log(`👥 Scraped Telegram members: ${telegramMembers}`);
      await redis.set("chilledcat:last_tg", String(telegramMembers));
      return { telegramMembers };
    }
    throw new Error("No members found");
  } catch (err) {
    console.warn("⚠️ Telegram scrape failed:", err.message);
    const cached = await redis.get("chilledcat:last_tg");
    if (cached) return { telegramMembers: Number(cached) };
    return { telegramMembers: 0 };
  }
}

// =====================================================
// 🐦 X / Twitter Scraper with mirror fallback
// =====================================================
let lastXCheck = 0;

async function getXData() {
  const now = Date.now();
  if (now - lastXCheck < 5 * 60 * 1000) {
    const cached = await redis.get("chilledcat:last_x_data");
    if (cached) return { followers: Number(cached) || 0 };
  }

  // 🌍 Working mirrors only
  const mirrors = [
    "https://nitter.net",              // ✅ Official — sometimes rate-limited
    "https://nitter.poast.org",        // ✅ Usually reliable
    "https://nitter.privacydev.net",   // ✅ Occasionally available
    "https://nitter.1d4.us",           // ✅ New, often up
    "https://nitter.moomoo.me"         // ✅ Backup mirror
  ];

  for (const base of mirrors) {
    try {
      const url = `${base}/ChilledCatCoin`;
      console.log(`🌐 Trying Nitter mirror: ${url}`);

      const { data } = await axios.get(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36",
        },
        timeout: 10000,
      });

      // ✅ Match current Nitter structure
      let match = data.match(
        /<li class="followers">\s*<span[^>]*>Followers<\/span>\s*<span[^>]*class="profile-stat-num">([\d,]+)/i
      );

      // 🕰️ Backup for older mirrors
      if (!match) {
        match =
          data.match(/profile-stat-num">([\d,]+)<\/span>\s*<span[^>]*>Followers/i) ||
          data.match(/Followers<\/span>\s*<span[^>]*class="profile-stat-num">([\d,]+)/i);
      }

      if (match) {
        const followers = parseInt(match[1].replace(/,/g, ""));
        console.log(`🐦 Followers from ${base}: ${followers}`);

        await redis.set("chilledcat:last_x_data", String(followers));
        await redis.set("chilledcat:last_nitter", base);
        lastXCheck = now;

        return { followers };
      }

      console.warn(`⚠️ No followers found on ${base}`);
    } catch (err) {
      console.warn(`⚠️ Nitter mirror failed (${base}): ${err.message}`);
      continue;
    }
  }

  // 🧩 Fallback to cache if all fail
  const fallback = await redis.get("chilledcat:last_nitter");
  if (fallback) console.warn(`⚠️ All mirrors failed. Last good mirror was: ${fallback}`);

  const cached = await redis.get("chilledcat:last_x_data");
  if (cached) return { followers: Number(cached) || 0 };

  console.warn("⚠️ All Nitter mirrors failed — using 0 followers.");
  return { followers: 0 };
}


// =====================================================
// 🧱 REDIS HELPERS
// =====================================================
async function loadPrevData() {
  try {
    const raw = await redis.get("chilledcat:stats");
    if (!raw) return {};
    console.log("📦 Loaded raw previous data (text mode):", raw.slice(0, 80) + "...");
    return {};
  } catch (err) {
    console.error("⚠️ Redis load error:", err.message);
    return {};
  }
}

async function saveData(data) {
  try {
    const timestamp = new Date().toISOString();
    let payload = "🐾 ChilledCat Stats Snapshot\n==========================\n";
    for (const [key, value] of Object.entries(data)) {
      payload += `${key}: ${value}\n`;
    }
    payload += `--------------------------\nTimestamp: ${timestamp}`;

    console.log("💾 Saving plain-text snapshot:\n", payload);
    await redis.set("chilledcat:stats", payload);
    console.log("✅ Redis save OK (plain-text mode)");
  } catch (err) {
    console.error("❌ Redis save error:", err.message);
  }
}

// =====================================================
// 🚀 MAIN FUNCTION
// =====================================================
function clean(value, decimals = 2) {
  if (value === null || isNaN(value)) return "—";
  return Number(value).toFixed(decimals);
}

const fmtUTC = (d) => d.toISOString().replace("T", " ").split(".")[0] + " UTC";

async function postHourlyStats(bot) {
  try {
    console.log("🚀 Fetching all Chilled Cat stats...");
    const [ton, dex, x, tg] = await Promise.all([
      getTonData(),
      getDexData(),
      getXData(),
      getTelegramData(),
    ]);

    const now = new Date();
    const next = new Date(now.getTime() + 60 * 60 * 1000);

    const statsData = {
      holdersCount: ton.holdersCount,
      ...dex,
      ...x,
      ...tg,
    };

    await saveData(statsData);

    const imgPath = await generateStatsCard({
      ...statsData,
      timestamp: now.toISOString(),
    });

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
