const Bot = require("telega");
let bot, M24_LOG_CHAT_ID, M24_CHAT_ID;

if (process.env.NODE_ENV == 'production') {
    bot = new Bot("545101798:AAGM1TodXYaS0MreKKimt23KZlXTmmEH_pU"); //m24
    M24_LOG_CHAT_ID = "-264612878";//
    M24_CHAT_ID = "-1001169214481";//"M24";

} else {

    bot = new Bot("496655496:AAFmg9mheE9urDt2oCQDIRL5fXjCpGYiAug"); //m24test
    // M24_LOG_CHAT_ID = "@modestemax";
    M24_LOG_CHAT_ID = "475514014";//"@modestemax";
    M24_CHAT_ID = M24_LOG_CHAT_ID// "-1001169214481";//"M24";
}
const tme = bot.api;

module.exports = { bot, tme, M24_LOG_CHAT_ID, M24_CHAT_ID };