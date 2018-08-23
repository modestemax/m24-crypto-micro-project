
const _ = require('lodash');
const { redisSet, redisGet} = require('common/redis');
const {  candleUtils } = require('common');

const M24_LOG_CHAT_ID = "475514014";//"@modestemax";
const M24_CHAT_ID = "-1001169214481";//"M24";

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
    case 'algo_loaded':
      text = ["Algo loaded", JSON.stringify(data)].join('\n')
      break;
    case 'timeframe':
      text = ["Timeframes loaded", JSON.stringify(data)].join('\n')
      break;
  }
  return text;

};