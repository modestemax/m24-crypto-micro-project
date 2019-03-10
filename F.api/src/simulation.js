// @flow
//const QUOTE_ASSET="BTC";
// const QUOTE_ASSET_REGEX = /usd|pax/i;
const QUOTE_ASSET_REGEX = /btc$/i;
// const QUOTE_ASSET_REGEX = /bnb$/i;
// const QUOTE_ASSET="USDT";
const Promise = require('bluebird');
const _ = require('lodash');
const fs = require('fs');

const moment = require('moment-timezone');
const TIME_ZONE = 'Africa/Douala'
const { getRedis, redisGet, publish } = require('common/redis');
const redis = getRedis()
const ONE_MIN = 1e3 * 60
const ONE_DAY = ONE_MIN * 60 * 24
global.tradesLog = []

const { publishPerf, loadCandles, listenToPriceChange, changePercent } = require('./binance-utils')
const loadPrevious = require('./load_previous_data')
require('./progress/viewProgess')
// const { priceChanged ,interval,limit} = require('./algos/a_topten')
const { priceChanged, interval, limit } = require('./algos/a_first');
//startup


(async () => {
    const symbols = await redisGet('symbols')
    const allSymbolsCandles = {}


        // publishPerf({ allSymbolsCandles, symbols, priceChanged });

    ;(async function start(symbols, startTime, closeTime) {
        for (let date = startTime; date < closeTime; date += ONE_MIN) {
            await Promise.mapSeries(symbols, async function loadLocal(symbol) {
                let data = await redis.hmgetAsync(symbol, +date)
                if (data && (_.isArray(data) ? data[0] : true)) {
                    try {
                        let candle = JSON.parse(data)
                        allSymbolsCandles[symbol] = allSymbolsCandles[symbol] || {}
                        allSymbolsCandles[symbol][+date] = candle
                        publish('price', { symbol, close: candle.close });
                    } catch (e) {
                        console.log(e)
                    }
                } else {
                    await loadPrevious([symbol], date)
                    await loadLocal(symbol)
                }
            })
            priceChanged(null, symbols, allSymbolsCandles, startTime, date);
        }
        saveLogs()
        console.log('END')
    })(symbols, +new Date('2019-03-06'), +new Date('2019-03-07'))
})()


function saveLogs() {
    const firstTrade = _.first(tradesLog)
    if (firstTrade) {
        let logs = _.map(tradesLog, t => ({
            startTime: moment(t.time).tz(TIME_ZONE).format('DD MMM HH:mm'),
            closeTime: moment(t.closeTime).tz(TIME_ZONE).format('DD MMM HH:mm'),
            inChange: t.inChange,
            inTime: moment(t.inTime).tz(TIME_ZONE).format('DD MMM HH:mm'),
            open: t.open,
            close: t.close,
            high: t.high,
            low: t.low,
            min: t.min,
            max_lost: t.max_lost,
        }));
        let txt = _.map(logs,  log=> _.values(log).join('\t')).join('\n')
        fs.writeFileSync(`~/tmp/m24-logs/${moment(firstTrade.inTime).format('DD MMM')}.tsv`, txt)
    }
    debugger
}