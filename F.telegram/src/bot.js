const Bot = require("telega");
let bot, MAXChatId, XBTTraderChatId;

if (process.env.NODE_ENV == 'production') {
    bot = new Bot("545101798:AAGM1TodXYaS0MreKKimt23KZlXTmmEH_pU"); //m24
    MAXChatId = "475514014";//"@modestemax";
    XBTTraderChatId = "-1001169214481";//"M24";

} else {

    bot = new Bot("496655496:AAFmg9mheE9urDt2oCQDIRL5fXjCpGYiAug"); //m24test
    MAXChatId = "@modestemax";
    // MAXChatId = "475514014";//"@modestemax";
    XBTTraderChatId = MAXChatId// "-1001169214481";//"M24";
}
const tme = bot.api;

module.exports = { bot, tme, MAXChatId, XBTTraderChatId };