const debug = require('debug')('F:index');

require('./command')
const { newOrder, newTrade, orderExpiredOrCanceled,
  tradeChanged, endTrade, displayMessage
} = require("./telegram");

const { bot, tme, MAXChatId, XBTTraderChatId } = require('./bot');

const _ = require('lodash')
const { subscribe: redisSubscribe, redisSet } = require('common/redis');


redisSubscribe('m24:*', {
  'm24:*': function (data, channel) {
    switch (channel) {
      case "m24:error":
        const { message, stack } = data;
        let stackCmd = '';
        if (stack) {
          const stackId = _.uniqueId();
          redisSet({ key: 'errorstack' + stackId, data: stack, expire: 24 * 60 * 60 }) //24 hour
          stackCmd = `get error stack at /error_stack providing this id: ${stackId}`;
        }
        text = ["Error", message, stackCmd].join("\n")
        break;
      case `m24:algo:pair_found`:
        const { side, strategy, symbolId, price } = data;
        text = [`Pair found ${strategy} ${side}`, `${symbolId} at ${price}`].join("\n")
        break;
      case `m24:algo:loaded`:
        text = ["Algo loaded", JSON.stringify(data)].join('\n')
        break;
      case `m24:timeframe`:
        text = ["Timeframes loaded", JSON.stringify(data)].join('\n')
        break;
    }
    tme.sendMessage({ chat_id: data.chat_id || MAXChatId, text });

  },
});


redisSubscribe('order:*', {
  'order:new': function (data, channel) { },
  'order:canceled': function (data, channel) { },
  'order:expired': function (data, channel) { },
})
redisSubscribe('trade:*', {

  'trade:new': function (data, channel) { },
  'trade:changed': function (data, channel) { },
  'trade:end': function (data, channel) { },
})
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


redisSub.psubscribe("order:*");
redisSub.psubscribe("trade:*");


debug('telegram bot started')
