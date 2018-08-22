const debug = require('debug')('F:index');

const { bot, tme, M24_LOG_CHAT_ID, M24_CHAT_ID } = require('./bot');

const _ = require('lodash')
const { redisSet } = require('common/redis');


module.exports = {
  'm24:*': function (data, channel) {
    let text;
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
        const { side, strategyName, symbolId, price } = data;
        text = [`Pair found #${strategyName} ${side}`, `${symbolId} at ${price}`].join("\n")
        break;
      case `m24:algo:loaded`:
        text = ["Algo loaded", JSON.stringify(data)].join('\n')
        break;
      case `m24:timeframe`:
        text = ["Timeframes loaded", JSON.stringify(data)].join('\n')
        break;
      case "m24:algo:tracking":
        text = [`#${data.strategyName}`,].concat(data.top5.map(t => `${t.symbolId} ${t.change}`)).join('\n')
        break

    }
    tme.sendMessage({ chat_id: data.chat_id || M24_LOG_CHAT_ID, text });

  },
}