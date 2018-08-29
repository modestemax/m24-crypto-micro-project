const { wait, start } = require('./lib/service_status_checker');
const { exchange, binance } = require('./lib/exchange')
const { fetchTickers, fetchBalance } = require('./lib/prices');
module.exports = Object.assign(require('./lib/utils'), {
    tradingView: require('./lib/trading-view'),
    candleUtils: require('./lib/candle-utils'),
    redis: require('./lib/redis'),
    exchange, binance, wait, start,
    fetchTickers, fetchBalance
});
