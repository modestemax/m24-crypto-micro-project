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
const allSymbolsCandles = {};
const { publishPerf, loadCandles, listenToPriceChange, changePercent } = require('./binance-utils')
const loadPrevious = require('./load_previous_data')
require('./progress/viewProgess')
const { priceChanged, interval, limit } = require('./algos/a_first');

module.exports = { startSimulation, simulate }

async function startSimulation(startTime, closeTime) {
    const symbols = await redisGet('symbols')
    await simulate(symbols, startTime, closeTime)
}

async function simulate(symbols, startTime, closeTime) {
    for (let date = startTime; date < closeTime; date += ONE_MIN) {
        await Promise.mapSeries(symbols, async function loadLocal(symbol) {
            let data = await redis.hmgetAsync(symbol, +date)
            if (data && (_.isArray(data) ? data[0] : true)) {
                try {
                    let candle = JSON.parse(data)
                    allSymbolsCandles[symbol] = allSymbolsCandles[symbol] || {}
                    allSymbolsCandles[symbol][+date] = candle
                    publish('price', { symbol, close: candle.close, closeTime: candle.closeTime });
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
}

function saveLogs() {
    let firstTrade = _.first(tradesLog)
    if (firstTrade) {
        let logs = _.map(tradesLog, t => ({
            symbol: t.symbol,
            startTime: moment(t.time).tz(TIME_ZONE).format('DD MMM HH:mm'),
            closeTime: moment(t.closeTime).tz(TIME_ZONE).format('DD MMM HH:mm'),
            inChange: t.inChange.toFixed(2),
            // inTime: moment(t.inTime).tz(TIME_ZONE).format('DD MMM HH:mm'),
            open: (+t.open).toFixed(8),
            close: (+t.close).toFixed(8),
            high: (+t.high).toFixed(8),
            low: (+t.low).toFixed(8),
            min: (+t.min).toFixed(8),
            max_lost: t.max_lost.toFixed(2),
            change: t.change.toFixed(2),
            highChange: t.highChange.toFixed(2),
            lowChange: t.lowChange.toFixed(2),
            minEndChange: (t.minEndChange || 0).toFixed(2),
        }));
        logs = [_.mapValues(_.first(logs), (v, k) => k)].concat(logs)
        let txt = _.map(logs, log => _.values(log).join('\t')).join('\n')
        fs.writeFileSync(`${process.env.HOME}/tmp/m24-logs/${moment(firstTrade.inTime).format('DD MMM')}.tsv`, txt)
    }

}


const { FROM_DATE, TO_DATE } = process.env;

const startTime = /^\d\d\d\d-\d\d-\d\d$/.test(FROM_DATE) && +new Date(FROM_DATE)
const closeTime = /^\d\d\d\d-\d\d-\d\d$/.test(FROM_DATE) && +new Date(TO_DATE);

if (startTime && closeTime) {
    startSimulation(startTime, closeTime)
}