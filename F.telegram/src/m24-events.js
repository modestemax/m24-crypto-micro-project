const debug = require('debug')('F:index');

const { bot, tme, M24_LOG_CHAT_ID, M24_FATAL_CHAT_ID, M24_CHAT_ID } = require('./bot');

const _ = require('lodash')
const { redisSet } = require('common/redis');
const { humanizeDuration } = require('common');

module.exports = {
  'm24:*': function (data, channel) {
    let text;
    switch (channel) {
      case "m24:fatal":
        text = ["#JUDE_ACTION", data].join('\n');
        data = { chat_id: M24_FATAL_CHAT_ID };
        tme.sendMessage({ chat_id: M24_CHAT_ID, text });
        break;
      case "m24:error":
        {
          const { message, stack } = data;
          let stackCmd = '';
          if (stack) {
            const stackId = _.uniqueId();
            redisSet({ key: 'errorstack' + stackId, data: stack, expire: 24 * 60 * 60 }) //24 hour
            stackCmd = `get error stack at /error_stack providing this id: ${stackId}`;
          }
          text = ["#error", message, stackCmd].join("\n");
          console.error(text, stack);
        }
        break;
      case `m24:algo:pair_found`:
        {
          const { side, strategyName, symbolId, price, test } = data;
          text = [`#pair_found${test ? '_test' : ''}_${strategyName}_${symbolId} `,
          `#pair_found${test ? '_test' : ''}_${strategyName} `,
          `${side} #${symbolId} at ${price} for #${strategyName} `,
          test ? "Test (will not bid)" : "Will Bid"].join("\n")
        } break;
      case `m24:algo:loaded`:
        text = ["Algo loaded", JSON.stringify(data)].join('\n')
        break;
      case `m24:timeframe`:
        text = ["Timeframes loaded", JSON.stringify(data)].join('\n')
        break;
      case "m24:algo:tracking":
        text = [`#${data.strategyName}`, data.text].join('\n')
        break
      case 'm24:algo:top_result':
        text = data.top.map(crypto => `#${crypto.symbolId} Gain: ${crypto.change.toFixed(2)}% Loss: ${(crypto.loss).toFixed(2)}% `)
        text = text.join('\n');
        break;
    }
    tme.sendMessage({ chat_id: data.chat_id || M24_LOG_CHAT_ID, text });

  },
  'm24sync:*': function (text) {
    tme.sendMessage({ chat_id: M24_LOG_CHAT_ID, text });
  }
}