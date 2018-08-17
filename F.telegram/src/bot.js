const Bot = require("telega");

// const bot = new Bot("545101798:AAGM1TodXYaS0MreKKimt23KZlXTmmEH_pU"); //m24
// const MAXChatId = "475514014";//"@modestemax";
// const XBTTraderChatId = "-1001169214481";//"M24";

const bot = new Bot("496655496:AAFmg9mheE9urDt2oCQDIRL5fXjCpGYiAug"); //m24test
const MAXChatId = "475514014";//"@modestemax";
const XBTTraderChatId = MAXChatId// "-1001169214481";//"M24";

const tme = bot.api;

module.exports = { bot, tme, MAXChatId, XBTTraderChatId };