/**
 * =====================================================
 * ChilledCatBot - Contests Module Entry
 * =====================================================
 */

const { startContest, endContest } = require("./contests");
const { isWhitelisted } = require("../../modules/safecat/protector");

function setupContests(bot) {
  // 🏁 Start contest
  bot.command("startcontest", async (ctx) => {
    if (!isWhitelisted(ctx.from.id)) {
      return ctx.reply("🚫 You are not whitelisted to start contests.");
    }

    const [_, game, minutes] = ctx.message.text.split(" ");
    await startContest(ctx, game || "flappycat", parseInt(minutes) || 10);
  });

  // 🏁 End contest
  bot.command("endcontest", async (ctx) => {
    if (!isWhitelisted(ctx.from.id)) {
      return ctx.reply("🚫 You are not whitelisted to end contests.");
    }

    const [_, game] = ctx.message.text.split(" ");
    await endContest(ctx, game || "flappycat");
  });

  console.log("🏆 Contest system ready for all games.");
}

module.exports = { setupContests };
