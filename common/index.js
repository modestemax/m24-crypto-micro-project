require('./lib/service_status_checker');
const auth = require(process.env.HOME + '/.api.json').KEYS;
module.exports = Object.assign(require('./lib/utils'), {
    auth,
    tradingView: require('./lib/trading-view'),
    candleUtils: require('./lib/candle-utils'),
    redis: require('./lib/redis'),
    exchange: require('./lib/exchange')(auth)
});
