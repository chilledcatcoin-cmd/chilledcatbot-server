/**
 * =====================================================
 * ChilledCatBot - Commands - commands.js
 * Registers all commands for games, contests, and features
 * =====================================================
 */

const { GAMES } = require("./games");
const { getLeaderboardCached } = require("./leaderboard");
const { contests, startContest, endContest } = require("./contests");

/* -------------------------------
   Leaderboard Sender
   ------------------------------- */
async function sendLeaderboard(ctx, game, scope = "global") {
  if (!game || !GAMES[game]) {
    return ctx.reply("Usage: /leaderboard <flappycat|catsweeper> [global|group|contest]");
  }

  let statName;
  let timeRemaining;

  if (scope === "group") {
    statName = `${game}_${ctx.chat.id}`;
  } else if (scope === "contest") {
    const c = contests.get(ctx.chat.id);
    if (!c || c.game !== game) {
      return ctx.reply("⚠️ There is no active contest for this game right now.");
    }
    if (Date.now() > c.expires) {
      return ctx.reply("🏁 The contest has ended. Start a new one with /startcontest.");
    }
    statName = c.contestKey;
    timeRemaining = c.expires - Date.now();
  } else if (scope === "global") {
    statName = `${game}_global`;
  } else {
    return ctx.reply("⚠️ Invalid scope. Use: global, group, or contest.");
  }

  try {
    const list = await getLeaderboardCached(statName);
    if (!list.length) return ctx.reply("No scores yet 😺");

    let msg = `🏆 *${game} Leaderboard* (${scope})\n\n`;
    list.forEach((e, i) => {
      const name = e.DisplayName || `Player${i + 1}`;
      msg += `${i + 1}. ${name} — ${e.StatValue}\n`;
    });

    if (scope === "contest" && timeRemaining > 0) {
      const mins = Math.floor(timeRemaining / 60000);
      const secs = Math.floor((timeRemaining % 60000) / 1000);
      msg += `\n⏳ Time remaining: *${mins}m ${secs}s*`;
    }

    ctx.reply(msg, { parse_mode: "Markdown" });
  } catch (e) {
    console.error("Leaderboard error", e.response?.data || e.message);
    ctx.reply("⚠️ Failed to fetch leaderboard.");
  }
}

/* -------------------------------
   Commands Setup
   ------------------------------- */
function setupCommands(bot) {
  /* -------------------------------
     Start / Help Menu
     ------------------------------- */
  bot.start((ctx) => {
    ctx.reply(
      "😺 Welcome to *Chilled Cat Games!*\n\nCommands:\n" +
        "🎮 /flappycat — Play Flappy Cat\n" +
        "💣 /catsweeper — Play CatSweeper\n" +
        "😼 /battleroyale — Start a Chilled Cat Battle Royale\n" +
        "🏆 /leaderboard <game> [global|group|contest]\n" +
        "🎯 /startcontest <game> <minutes>\n" +
        "🏁 /endcontest <game>\n" +
        "📊 /flappycontest — View Flappy Cat contest\n" +
        "📊 /sweepercontest — View CatSweeper contest\n" +
        "🧹 /clear — Clear the chat (DM only)",
      { parse_mode: "Markdown" }
    );
  });

  /* -------------------------------
     Games
     ------------------------------- */
  bot.command("flappycat", (ctx) => ctx.replyWithGame("flappycat"));
  bot.command("catsweeper", (ctx) => ctx.replyWithGame("catsweeper"));

  /* -------------------------------
     Clear Chat (DM only)
     ------------------------------- */
  bot.command("clear", async (ctx) => {
    if (ctx.chat.type !== "private") {
      return ctx.reply("🚫 The /clear command is only available in direct messages with me.");
    }

    try {
      await ctx.deleteMessage(ctx.message.message_id).catch(() => {});
      const lines = Array(50).fill("‎ ").join("\n");
      await ctx.reply(`🧹 Clearing your screen...\n${lines}\n✨ All clean!`);
    } catch (err) {
      console.error("Clear command error:", err);
      await ctx.reply("⚠️ Could not clear messages.");
    }
  });

  /* -------------------------------
     Leaderboard
     ------------------------------- */
  bot.command("leaderboard", async (ctx) => {
    const parts = ctx.message.text.split(" ");
    const game = parts[1];
    const scope = parts[2] || "global";
    await sendLeaderboard(ctx, game, scope);
  });

  bot.command("flappyglobal", (ctx) => sendLeaderboard(ctx, "flappycat", "global"));
  bot.command("flappygroup", (ctx) => sendLeaderboard(ctx, "flappycat", "group"));

  bot.command("sweeperglobal", (ctx) => sendLeaderboard(ctx, "catsweeper", "global"));
  bot.command("sweepergroup", (ctx) => sendLeaderboard(ctx, "catsweeper", "group"));

  /* -------------------------------
     Contest Commands
     ------------------------------- */
  bot.command("startcontest", async (ctx) => {
    if (ctx.chat.type === "private") {
      return ctx.reply("⚠️ Contests can only be started in groups.");
    }

    const parts = ctx.message.text.split(" ");
    const game = parts[1];
    const minutes = parseInt(parts[2] || "30"); // default 30m

    try {
      const member = await ctx.telegram.getChatMember(ctx.chat.id, ctx.from.id);
      if (member.status !== "administrator" && member.status !== "creator") {
        return ctx.reply("⚠️ Only group admins can start contests.");
      }
    } catch (err) {
      console.error("Admin check failed:", err);
      return ctx.reply("⚠️ Could not verify admin rights.");
    }

    startContest(ctx, game, minutes, ctx.chat.title);
  });

  bot.command("endcontest", async (ctx) => {
    if (ctx.chat.type === "private") {
      return ctx.reply("⚠️ Contests can only be ended in groups.");
    }

    const parts = ctx.message.text.split(" ");
    const game = parts[1];
    endContest(ctx, game);
  });

  /* -------------------------------
     Telegram Command Menu (for / menu)
     ------------------------------- */

// Set global commands (for DMs)
bot.telegram.setMyCommands(
  [
    { command: "flappycat", description: "Play Flappy Cat" },
    { command: "catsweeper", description: "Play CatSweeper" },
    { command: "leaderboard", description: "View game leaderboards" },
    { command: "howchill", description: "How Chill Are You?" },
    { command: "fortune", description: "Get Your Fortune Told!" }
  ],
  { scope: { type: "default" } }
);

// Set group commands (for all groups)
bot.telegram.setMyCommands(
  [
    { command: "br", description: "Battle Royale command list" },
    { command: "brstart", description: "Start a new Battle Royale (admin)" },
    { command: "brcancel", description: "Cancel the current Battle Royale" },
    { command: "brforceend", description: "Force-end and declare a winner" },
    { command: "brjoin", description: "Join the current battle" },
    { command: "brleave", description: "Leave or forfeit" },
    { command: "roll", description: "Roll during a duel" },
    { command: "brstatus", description: "Check current battle status" },
    { command: "startcontest", description: "Start a contest (admin)" },
    { command: "endcontest", description: "End the active contest" },
    { command: "howchill", description: "How Chill Are You?" },
    { command: "fortune", description: "Get Your Fortune Told!" }
  ],
  { scope: { type: "all_group_chats" } }
)
.then(() => console.log("✅ Telegram command lists updated for DMs and groups."));


  /* -------------------------------
     Game Launch via Callback
     ------------------------------- */
  bot.on("callback_query", async (ctx) => {
    const q = ctx.update.callback_query;

    if (q.game_short_name) {
      const shortName = q.game_short_name;
      if (!GAMES[shortName]) return ctx.answerCbQuery("Unknown game!");

      const url = new URL(GAMES[shortName]);
      url.searchParams.set("uid", q.from.id);
      url.searchParams.set("chat_id", q.message.chat.id);
      url.searchParams.set("message_id", q.message.message_id);
      url.searchParams.set("_ts", Date.now());

      const tgName = q.from.username || q.from.first_name || "Anonymous";
      url.searchParams.set("username", tgName);

      const c = contests.get(ctx.chat.id);
      if (c && c.game === shortName && Date.now() < c.expires) {
        url.searchParams.set("contest", c.contestKey);
      }

      return ctx.telegram.answerGameQuery(q.id, url.toString());
    }
  });

  console.log("✅ General commands registered.");

}

module.exports = { setupCommands };
