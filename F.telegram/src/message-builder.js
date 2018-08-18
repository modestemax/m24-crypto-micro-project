
const _ = require('lodash');
const { redisSet, redisGet, candleUtils } = require('common');

const MAXChatId = "475514014";//"@modestemax";
const XBTTraderChatId = "-1001169214481";//"M24";

module.exports = function getMessageText(data) {
  let text;
  switch (data.type) {
    case 'error':
      const { message, stack } = data;
      let stackCmd = '';
      if (stack) {
        const stackId = _.uniqueId();
        redisSet({ key: 'errorstack' + stackId, data: stack, expire: 24 * 60 * 60 }) //24 hour
        stackCmd = `get error stack at /error_stack providing this id: ${stackId}`;
      }

      text = ["Error", message, stackCmd].join("\n")
      break;
    case 'pair_found':
      const { side, strategy, symbolId, price } = data;
      text = [`Pair found ${strategy} ${side}`, `${symbolId} at ${price}`].join("\n")
      break;
  }
  return text;

};