const debug = require('debug')('F:index');
const { publish, getRedis } = require("common");
require('./command')
const {
  newOrder, newTrade, orderExpiredOrCanceled,
  tradeChanged, endTrade, displayMessage
} = require("./telegram");

const redisSub = getRedis();

redisSub.on("pmessage", async (pattern, channel, data) => {

  const json = JSON.parse(data);
  switch (channel) {
    case "order:new": newOrder(json); break;
    case "order:canceled":
    case "order:expired": orderExpiredOrCanceled(json); break;
    case "trade:new": newTrade(json); break;
    case "trade:changed": tradeChanged(json); break;
    case "trade:end": endTrade(json); break;
    default:
      onM24(channel, json);
  }
});

function onM24(channel, data) {
  switch (channel) {
    case "m24:error": data.type = 'error'; break;
    case `m24:algo:pair_found`: data.type = 'pair_found'; break;
  }
  return data.type && displayMessage(data);
}

redisSub.psubscribe("order:*");
redisSub.psubscribe("trade:*");
redisSub.psubscribe("m24:*");


debug('telegram bot started')

process.env.STATUS_OK_TEXT = "Telegram Bot is OK";