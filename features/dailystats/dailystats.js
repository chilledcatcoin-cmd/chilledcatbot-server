/**
 * =====================================================
 * Chilled Cat Stats Engine (Upstash + Telegram + Hyperlinks)
 * =====================================================
 *  - Dexscreener + TONCenter + TonViewer + X (Google/DuckDuckGo scraper)
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

    await redis.set("chilledcat:last_dex", JSON.stringify(result));
    return result;
  } catch (err) {
    console.warn("⚠️ Dexscreener fetch failed:", err.message);
    const cached = await redis.get("chilledcat:last_dex");
    if (cached) {
      console.log("📦 Using cached Dex data");
      return JSON.parse(cached);
    }
    return { priceUsd: 0, priceChange24h: 0, volume24hUsd: 0, liquidityUsd: 0 };
  }
}

/**
 * Telegram members (Bot API first, HTML fallback)
 */
async function getTelegramData(bot) {
  try {
    // 1️⃣ Try Telegram Bot API for precise member count
    const chatInfo = await bot.telegram.getChat(CHANNEL_ID);
    if (chatInfo && chatInfo.title) {
      const count = chatInfo?.members_count || chatInfo?.all_members_count;
      if (count) {
        console.log(`👥 Accurate Telegram members (API): ${count}`);
        await redis.set("chilledcat:last_tg", String(count));
        return { telegramMembers: count };
      }
    }

    // 2️⃣ Fallback to scraping if API didn’t provide count
    console.log("⚠️ Bot API did not return members_count — falling back to HTML scrape");
    const { data } = await axios.get(LINKS.telegram, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36",
      },
      timeout: 10000,
    });

    const match =
      data.match(/(\d+(?:,\d+)*)\s+members/i) ||
      data.match(/(\d+(?:,\d+)*)\s+subscribers/i) ||
      data.match(/tgme_page_extra[^>]*>([^<]+)<\/div>/i);

    if (match) {
      const numberMatch = match[1]?.match(/(\d+(?:,\d+)*)/);
      const count = numberMatch ? parseInt(numberMatch[1].replace(/,/g, "")) : 0;
      if (count > 0) {
        console.log(`👥 Scraped Telegram members (fallback): ${count}`);
        await redis.set("chilledcat:last_tg", String(count));
        return { telegramMembers: count };
      }
    }

    throw new Error("No member count found in fallback HTML");
  } catch (err) {
    console.warn("⚠️ Telegram scrape/API failed:", err.message);
    const cached = await redis.get("chilledcat:last_tg");
    if (cached) {
      console.log(`📦 Using cached Telegram members: ${cached}`);
      return { telegramMembers: Number(cached) };
    }
    return { telegramMembers: 0 };
  }
}

/**
 * X Followers — Google + DuckDuckGo fallback
 */
let lastXCheck = 0;
async function getXData() {
  const now = Date.now();

  // Cache for 5 minutes
  if (now - lastXCheck < 5 * 60 * 1000) {
    const cached = await redis.get("chilledcat:last_x_data");
    if (cached) {
      console.log("🕒 Using cached X data (<5m old)");
      return { followers: Number(cached) || 0 };
    }
  }

  let followers = 0;

  // 1️⃣ Google Search
  try {
    console.log("🔍 Trying Google Search for followers...");
    const { data } = await axios.get(
      "https://www.google.com/search?q=ChilledCatCoin+site:x.com",
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36",
        },
        timeout: 10000,
      }
    );

    const match = data.match(/([\d,]+)\s*Followers/i);
    if (match) {
      followers = parseInt(match[1].replace(/,/g, ""));
      console.log(`✅ Found via Google: ${followers} followers`);
    } else {
      console.warn("⚠️ Google returned no follower match");
    }
  } catch (err) {
    console.warn(`⚠️ Google search failed: ${err.message}`);
  }

  // 2️⃣ DuckDuckGo fallback
  if (!followers) {
    try {
      console.log("🦆 Trying DuckDuckGo fallback...");
      const { data } = await axios.get(
        "https://duckduckgo.com/html/?q=ChilledCatCoin+site:x.com",
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36",
          },
          timeout: 10000,
        }
      );

      const match = data.match(/([\d,]+)\s*Followers/i);
      if (match) {
        followers = parseInt(match[1].replace(/,/g, ""));
        console.log(`✅ Found via DuckDuckGo: ${followers} followers`);
      } else {
        console.warn("⚠️ DuckDuckGo returned no follower match");
      }
    } catch (err) {
      console.warn(`⚠️ DuckDuckGo scrape failed: ${err.message}`);
    }
  }

  // 3️⃣ Cache fallback
  if (!followers) {
    const cached = await redis.get("chilledcat:last_x_data");
    if (cached) {
      followers = Number(cached) || 0;
      console.log(`📦 Using cached followers: ${followers}`);
    } else {
      console.warn("⚠️ No cached follower data available");
    }
  }

  await redis.set("chilledcat:last_x_data", String(followers));
  lastXCheck = now;
  return { followers };
}

// =====================================================
// 🧱 REDIS SAVE + HELPERS
// =====================================================
async function saveData(data) {
  try {
    const timestamp = new Date().toISOString();
    let payload = "🐾 ChilledCat Stats Snapshot\n==========================\n";
    for (const [key, value] of Object.entries(data)) {
      payload += `${key}: ${value}\n`;
    }
    payload += `--------------------------\nTimestamp: ${timestamp}`;
    console.log("💾 Saving snapshot:\n", payload);
    await redis.set("chilledcat:stats", payload);
    console.log("✅ Redis save OK");
  } catch (err) {
    console.error("❌ Redis save error:", err.message);
  }
}

const fmtUTC = (d) => d.toISOString().replace("T", " ").split(".")[0] + " UTC";

// =====================================================
// 🚀 MAIN POST FUNCTION
// =====================================================
async function postHourlyStats(bot) {
  try {
    console.log("🚀 Fetching all Chilled Cat stats...");
    const [ton, dex, x, tg] = await Promise.all([
      getTonData(),
      getDexData(),
      getXData(),
      getTelegramData(bot),
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
