require("dotenv").config();
const express=require("express");const {Telegraf}=require("telegraf");const axios=require("axios");
const app=express();app.use(express.json());
const BOT_TOKEN=process.env.BOT_TOKEN;const PLAYFAB_TITLE_ID=process.env.PLAYFAB_TITLE_ID;const PLAYFAB_DEV_SECRET=process.env.PLAYFAB_DEV_SECRET;
if(!BOT_TOKEN||!PLAYFAB_TITLE_ID||!PLAYFAB_DEV_SECRET)throw new Error("Missing env vars");
const bot=new Telegraf(BOT_TOKEN);
const GAMES={flappycat:"https://chilledcatcoin-cmd.github.io/chilledcatbot/games/flappycat/flappycat.html",
catsweeper:"https://chilledcatcoin-cmd.github.io/chilledcatbot/games/catsweeper/catsweeper.html"};
bot.start(ctx=>ctx.reply("😺 Welcome! Play /flappycat or /catsweeper"));
bot.command("flappycat",ctx=>ctx.replyWithGame("flappycat"));
bot.command("catsweeper",ctx=>ctx.replyWithGame("catsweeper"));
bot.command("leaderboard",async ctx=>{const parts=ctx.message.text.split(" ");const game=parts[1];
if(!game||!GAMES[game])return ctx.reply("Usage: /leaderboard <flappycat|catsweeper>");
const statName=`${game}_${ctx.chat.id}`;
try{const resp=await axios.post(`https://${PLAYFAB_TITLE_ID}.playfabapi.com/Server/GetLeaderboard`,{StatisticName:statName,StartPosition:0,MaxResultsCount:10},
{headers:{"X-SecretKey":PLAYFAB_DEV_SECRET}});
const list=resp.data.data.Leaderboard;if(!list.length)return ctx.reply("No scores yet 😺");
let msg=`🏆 Leaderboard — ${game}\n`;list.forEach((e,i)=>{const name=e.DisplayName||`Player${i+1}`;msg+=`${i+1}. ${name} — ${e.StatValue}\n`;});
ctx.reply(msg);}catch(e){console.error("Leaderboard error",e.response?.data||e.message);ctx.reply("Failed to fetch leaderboard.");}});
bot.on("callback_query",async ctx=>{const q=ctx.update.callback_query;const shortName=q.game_short_name;
if(!GAMES[shortName])return ctx.answerCbQuery("Unknown game!");const url=new URL(GAMES[shortName]);
url.searchParams.set("uid",q.from.id);url.searchParams.set("chat_id",q.message.chat.id);url.searchParams.set("message_id",q.message.message_id);
ctx.telegram.answerGameQuery(q.id,url.toString());});
bot.launch();const PORT=process.env.PORT||3000;app.listen(PORT,()=>console.log("🚀 Server running on "+PORT));
