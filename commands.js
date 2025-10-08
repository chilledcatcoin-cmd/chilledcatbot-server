/**
 * =====================================================
 * ChilledCatBot - commands.js
 * Handles /start, /help, and Telegram command menu
 * =====================================================
 */

function setupCommands(bot) {
  // 🎮 Welcome & Help
  bot.start((ctx) => {
    ctx.reply(
      "😺 *Welcome to ChilledCatBot!*\n\n" +
        "Available commands:\n" +
        "🧊 /howchill — Check how chill you are\n" +
        "🏓 /ping — Test if the bot is alive\n" +
        "\nMore features coming soon!",
      { parse_mode: "Markdown" }
    );
  });

  bot.help((ctx) =>
    ctx.reply(
      "💡 Need help?\n\n" +
        "Use /howchill to find your Chill Level™.\n" +
        "Use /ping to test if the bot is responsive.\n" +
        "\nStay tuned for more Chilled Cat features! 😼"
    )
  );

  // 🏓 Simple ping test
  bot.command("ping", (ctx) => ctx.reply("🏓 Pong!"));

  // 📜 Set Telegram menu command list
  bot.telegram
    .setMyCommands([
      { command: "howchill", description: "Check your Chill Level™" },
      { command: "ping", description: "Check if bot is alive" },
    ])
    .then(() => console.log("✅ Command list updated."));
}

module.exports = { setupCommands };
