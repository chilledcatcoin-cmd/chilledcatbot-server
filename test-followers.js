const axios = require("axios");
const { Redis } = require("@upstash/redis");
const redis = new Redis({ url: process.env.UPSTASH_URL, token: process.env.UPSTASH_TOKEN });

(async () => {
  const result = await getXData();
  console.log("Final follower count:", result.followers);
})();
