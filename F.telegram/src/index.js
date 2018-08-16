const { publish, getRedis } = require("common");

const { newOrder, newTrade, orderExpiredOrCanceled, tradeChanged, endTrade,displayError } = require("./telegram");

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
    case "error": displayError(json); break;
  }
});

redisSub.psubscribe("order:*");
redisSub.psubscribe("trade:*");
redisSub.psubscribe("error");
