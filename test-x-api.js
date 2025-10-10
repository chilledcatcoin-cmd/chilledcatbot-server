const axios = require("axios");
const OAuth = require("oauth-1.0a");
const crypto = require("crypto");
require("dotenv").config();

const oauth = OAuth({
  consumer: {
    key: process.env.X_CONSUMER_KEY,
    secret: process.env.X_CONSUMER_SECRET,
  },
  signature_method: "HMAC-SHA1",
  hash_function(base, key) {
    return crypto.createHmac("sha1", key).update(base).digest("base64");
  },
});

const token = {
  key: process.env.X_ACCESS_TOKEN,
  secret: process.env.X_ACCESS_SECRET,
};

const request_data = {
  url: "https://api.x.com/1.1/users/show.json?screen_name=ChilledCatCoin",
  method: "GET",
};

(async () => {
  try {
    const response = await axios.get(request_data.url, {
      headers: oauth.toHeader(oauth.authorize(request_data, token)),
    });
    console.log("✅ Success:", response.data);
  } catch (error) {
    console.error("❌ Error:", error.response?.data || error.message);
  }
})();
