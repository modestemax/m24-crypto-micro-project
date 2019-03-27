// @flow
//const QUOTE_ASSET="BTC";
// const QUOTE_ASSET_REGEX = /usd|pax/i;
const QUOTE_ASSET_REGEX = /btc$/i;
// const QUOTE_ASSET_REGEX = /bnb$/i;
// const QUOTE_ASSET="USDT";
const _ = require('lodash');

const moment = require('moment-timezone');
const TIME_ZONE = 'Africa/Douala'
const { getRedis, redisSet } = require('common/redis');
const redis = getRedis()
const { publishPerf, loadCandles, listenToPriceChange, changePercent } = require('./binance-utils')

const binance = require('./init-binance');
const { SYMBOLS, ALL_SYMBOLS, FROM_DATE, TO_DATE } = process.env;

const ONE_MIN = 1e3 * 60
const ONE_DAY = ONE_MIN * 60 * 24;

const startTime = /^\d\d\d\d-\d\d-\d\d$/.test(FROM_DATE) && +new Date(FROM_DATE)
const closeTime = /^\d\d\d\d-\d\d-\d\d$/.test(FROM_DATE) && +new Date(TO_DATE);

if ((SYMBOLS || ALL_SYMBOLS) && startTime && closeTime)
    if (console.log('loading', FROM_DATE, TO_DATE) || 1)
        binance.exchangeInfo(async function ex_info(error, data) {

            if (error) {
                console.log(error);
                binance.exchangeInfo(ex_info)
            } else {
                console.log('binance info loaded')
                let symbols = []
                const allSymbolsCandles = {}

                // const symbols = ['ETHBTC', 'ADABTC'];
                const binanceSymbols = data.symbols
                    .filter(s => s.status === "TRADING")
                    .filter(s => QUOTE_ASSET_REGEX.test(s.quoteAsset))
                    .map(s => s.symbol);

                if (SYMBOLS) {
                    symbols = SYMBOLS.split(/;|:|\s+/)
                } else {

                    symbols = await new Promise((resolve, reject) => {
                        binance.bookTickers(async (error, tickers) => {
                            if (error) process.nextTick(() => binance.exchangeInfo(ex_info))
                            let symbols = _.filter(binanceSymbols, symbol => {
                                const ticker = _.find(tickers, { symbol })
                                return (ticker && changePercent(ticker.bidPrice, ticker.askPrice) < .6)
                            });

                            await redisSet({ key: 'symbols', data: symbols })
                            resolve(symbols);
                        });
                    });
                }

                console.log('loadind data for ', symbols.length, 'symbols')
                await (async () => {
                    for (let date = startTime; date <= closeTime; date += ONE_DAY) {
                        // await (loadPrevious(symbols, `2019/03/${j}`, allSymbolsCandles))
                        await (loadPrevious(symbols, date, allSymbolsCandles))
                    }
                })()

                console.log('END')
                process.exit(0)

            }
        });

module.exports = loadPrevious

async function loadPrevious(symbols, date, allSymbolsCandles = {}) {
    console.log('loading old data for ', new Date(date))
    const errors = [];
    for (const symbol of symbols) {
        console.log('loading old data for ', symbol)

        try {
            let interval = '1m', limit = 60 * 24, startTime = +new Date(date)
            allSymbolsCandles[symbol] = await loadCandles(symbol, interval, limit, startTime);
            let mostRecentDate = +_.first(_.keys(allSymbolsCandles[symbol]))
            if (startTime !== mostRecentDate)
                throw {
                    stop: true,
                    message: `most recent date is ${moment(+(mostRecentDate)).tz(TIME_ZONE).format('DD MMM HH:mm')}`
                }
            let data = _.map(allSymbolsCandles[symbol], candle => {
                return [candle.startTime, JSON.stringify(candle)]
            })
            data = [symbol].concat(_.flatten(data))

            await redis.hmsetAsync(data)
            console.log(symbol, date, 'saved')
            // debugger
        } catch (e) {
            console.log(symbol, e.message);
            if (e.stop || e.code === 'MISCONF') throw e
            errors.push(symbol);
        }
    }
    errors.length && await new Promise((resolve) =>
        setTimeout(() => resolve(loadPrevious(errors, date, allSymbolsCandles), 30 * 1e3)))
}