// @flow
//const QUOTE_ASSET="BTC";
// const QUOTE_ASSET_REGEX = /usd|pax/i;
const QUOTE_ASSET_REGEX = /btc$/i;
// const QUOTE_ASSET_REGEX = /bnb$/i;
// const QUOTE_ASSET="USDT";
const _ = require('lodash');
const { getRedis, redisGet, publish } = require('common/redis');
const redis = getRedis()
const ONE_MIN = 1e3 * 60
const ONE_DAY = ONE_MIN * 60 * 24
const { publishPerf, loadCandles, listenToPriceChange, changePercent } = require('./binance-utils')

require('./progress/viewProgess')
// const { priceChanged ,interval,limit} = require('./algos/a_topten')
const { priceChanged, interval, limit } = require('./algos/a_first');
//startup
(async () => {
    const symbols = await redisGet('symbols')
    const allSymbolsCandles = {}


    publishPerf({ allSymbolsCandles, symbols, priceChanged });

    (async function start(symbols, dateOrigin) {
        for (let date = dateOrigin; date < date + ONE_DAY; date += ONE_MIN) {
            for (const symbol of symbols) {
                let candle = JSON.parse(await redis.hmgetAsync(symbol, +date))
                allSymbolsCandles[symbol] = allSymbolsCandles[symbol] || {}
                allSymbolsCandles[symbol][+date] = candle
                priceChanged(symbol, symbols, allSymbolsCandles, dateOrigin, date);
            }
        }
    })(symbols, +new Date('2019/03/07'))
})()

