/**
 * =====================================================
 * X Scraper (No API Needed)
 * =====================================================
 * Grabs follower count from public Twitter (X) page.
 * Parses K/M suffixes and returns a proper number.
 * =====================================================
 */

const axios = require("axios");
const cheerio = require("cheerio");

function parseFollowers(text) {
  if (!text) return 0;
  const match = text.match(/([\d.,]+)\s*[KM]?\s*Followers?/i);
  if (!match) return 0;

  let num = parseFloat(match[1].replace(/,/g, ""));
  if (/K/i.test(text)) num *= 1_000;
  if (/M/i.test(text)) num *= 1_000_000;
  return Math.round(num);
}

async function getTwitterFollowers(username = "ChilledCatCoin") {
  try {
    const url = `https://x.com/${username}`;
    const { data } = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36",
      },
    });

    const $ = cheerio.load(data);
    const followersText = $('a[href$="/followers"] span').first().text();

    const count = parseFollowers(followersText);
    console.log(`🐦 Scraped X followers: ${count}`);
    return count;
  } catch (err) {
    console.error("❌ X scraping failed:", err.message);
    return 0;
  }
}

module.exports = { getTwitterFollowers };
