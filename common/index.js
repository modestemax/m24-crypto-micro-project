module.exports = Object.assign(require('./lib/utils'), {
    auth: require(process.env.HOME + '/.api.json').KEYS,
    tradingView: require('./lib/trading-view'),
    candleUtils: require('./lib/candle-utils')
});                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  