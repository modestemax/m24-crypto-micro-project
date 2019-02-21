// @flow
//const QUOTE_ASSET="BTC";
// const QUOTE_ASSET_REGEX = /usd|pax/i;
const QUOTE_ASSET_REGEX = /btc$/i;
// const QUOTE_ASSET="USDT";
const _ = require('lodash');
const { publish, subscribe } = require('common/redis');


const binance = require('./init-binance')
publish.throttle = _.throttle(publish, 1e3);
publish.throttle2 = _.throttle(publish, 1e3);

// const _1MIN = 1e3 * 60;
// const _1H = _1MIN * 60;
// const _24H = _1H * 24;


const DURATION = {
    MIN_1: 1, MIN_2: 2, MIN_3: 3, MIN_5: 5, MIN_15: 15, MIN_30: 30,
    HOUR_1: 60, HOUR_2: 120, HOUR_4: 240, HOUR_6: 360, HOUR_8: 480, HOUR_12: 720, HOUR_24: 1440,
}
Object.keys(DURATION).forEach(duration => DURATION[duration] *= 60 * 1e3)

const timeframeStartAt = (timeframe) => () => {
    const now = Date.now();
    return now - now % timeframe
}

const DEFAULT_PERIODS = {
    m1: DURATION.MIN_1,
    m2: DURATION.MIN_2,
    m3: DURATION.MIN_3,
    m5: DURATION.MIN_5,
    m15: DURATION.MIN_15,
    m30: DURATION.MIN_30,
    h1: DURATION.HOUR_1,
    h2: DURATION.HOUR_2,
    h4: DURATION.HOUR_4,
    h6: DURATION.HOUR_6,
    h8: DURATION.HOUR_8,
    h12: DURATION.HOUR_12,
    h24: DURATION.HOUR_24,
    day: timeframeStartAt(DURATION.HOUR_24),
    H4: timeframeStartAt(DURATION.HOUR_4),
    ALGO: timeframeStartAt(DURATION.HOUR_1),
}

const change = (open, close) => (close - open) / open;
const changePercent = (open, close) => change(open, close) * 100;

const indexTicksByTime = ticks => ticks.reduce((ticks, tick) => {
    let [startTime, open, high, low, close, volume, closeTime, assetVolume,
        trades, buyBaseVolume, buyAssetVolume, ignored] = tick;
    return {
        ...ticks,
        [startTime]: {
            startTime, open, high, low, close, volume, closeTime,
            assetVolume, trades, buyBaseVolume, buyAssetVolume, ignored
        }
    }
}, {});


/**
 * get prev candle & index them by open time
 * @param symbol
 * @param interval
 * @param limit
 * @returns {Promise<*>}
 */
async function loadCandles(symbol, interval = '1m', limit = 1440 + 15) {
    // $FlowFixMe
    let { ticks: ticks1, closeTime } = await getCandlesticksFromBinance({
        symbol, interval, startTime: Date.now() - limit * 60 * 1e3
    });
    // $FlowFixMe
    let { ticks: ticks2 } = closeTime ? await getCandlesticksFromBinance({
        symbol, interval, startTime: closeTime
    }) : { ticks: [] };

    return indexTicksByTime([...ticks1, ...ticks2]);


    function getCandlesticksFromBinance({ symbol, interval, startTime, limit = 1000 }) {
        return new Promise(((resolve, reject) => {
            binance.candlesticks(symbol, interval, (error, ticks, symbol) => {
                if (error) return reject(error);
                let last_tick = _.last(ticks);
                let closeTime = last_tick && last_tick[6];
                resolve({ closeTime, ticks });
            }, { startTime, limit });
        }));
    }
}

/**
 * real time price listening
 * @param symbol
 * @param candles
 */
function listenToPriceChange({ candles, symbol }) {
    binance.websockets.candlesticks(symbol, '1m', ({ k: ticks }) => {
        let {
            t: startTime, x: isFinal, i: interval, o: open, h: high, l: low, c: close, v: volume, T: closeTime,
            assetVolume, n: trades,/*V: buyBaseVolume,q: buyAssetVolume, ignored*/
        } = ticks;
        // console.log(symbol + " " + interval + " candlestick update");
        publish('price', { symbol, close });

        // if (changePercent(close, +close + SATOSHI) < MAX_SPREAD) {
        //     prevPerf[symbol] = getPrevPerformance({ candles, symbol, ticks });
        // } else return;
        addOrUpdateCandle({
            candles,
            symbol, startTime, candle: {
                isFinal, interval,
                open, high, low, close, volume, startTime, closeTime,
                assetVolume, trades,/*V: buyBaseVolume,q: buyAssetVolume, ignored*/
                // change:changePercent(open,close)
            }
        })

        if (isFinal) {
            console.log(symbol + ' final');
            forgetOldCandles({ candles, symbol })
        }
    });
}

function addOrUpdateCandle({ candles, startTime, candle }) {
    candles[startTime] = candle
}

/**
 * forget candle older than 24h
 */
function forgetOldCandles({ candles }) {
    const now = Date.now()
    const time = now - now % DURATION.MIN_1
    let oldTime = time - (DURATION.HOUR_24 + DURATION.MIN_15);
    Object.keys(candles).forEach(time => time < oldTime && delete candles[oldTime])

}

function getChangeFrom({ candles, symbol, period, from, timeframeName }) {
    const now = Date.now()
    const now_0 = now - now % DURATION.MIN_1;
    const now_1 = now_0 - DURATION.MIN_1
    const startTime = from || (typeof period === 'function' ? period() : now_0 - period)
    if (startTime && candles) {
        const startCandle = candles[startTime];
        const lastCandle = candles[now_0] || candles[now_1];
        if (startCandle && lastCandle) {
            const [open, close] = [+startCandle.open, +lastCandle.close]
            return {
                symbol, timeframeName,
                open, close,
                change: changePercent(open, close)
            }
        }
        !startCandle && console.log(`${symbol} startCandle not found at [${startTime}] ${new Date(startTime)}`)
        !lastCandle && console.log(`${symbol} lastCandle not found at [${now_0}] ${new Date(now_0)}`)
    }
}

/**
 * get changes for all pairs in a defined period of time
 * @param allSymbolsCandles
 * @param period : duration in millisecond
 * @param from : start time
 * @param timeframeName
 * @returns {{}}
 */
function getSymbolsChanges({ allSymbolsCandles, period, from, timeframeName }) {
    return _.mapValues(allSymbolsCandles, (candles, symbol) => getChangeFrom({ candles, symbol, period, from, timeframeName }))
}

/**
 * get changes for all periods of a given pair
 * @param candles
 * @param symbol
 * @param periods :{M1:12938747000,}
 * @returns {{}}
 */
function getPeriodsChanges({ candles, symbol, periods }) {
    return _.mapValues(periods, (period, timeframeName) => getChangeFrom({ candles, symbol, period, timeframeName }))
}


function publishPerf({ allSymbolsCandles,symbols, periods = DEFAULT_PERIODS, priceChanged }) {
    const perfs = {}
    subscribe('price', ({ symbol }) => {
        priceChanged && priceChanged(symbol,symbols, allSymbolsCandles)

        const symbolPerfs = getPeriodsChanges({ candles: allSymbolsCandles[symbol], symbol, periods });

        perfs[symbol] = _.mapValues(symbolPerfs, (perf, period) =>
            perf || (perfs[symbol] && perfs[symbol][period] && { isDirty: true, ...perfs[symbol][period] }))


        publish.throttle('prevPerf', Object.values(perfs))
        // publish.throttle2('ALL_SYMBOLS_CANDLES', allSymbolsCandles)
        // publish('prevPerf', Object.values(perfs))
        // publish('ALL_SYMBOLS_CANDLES', allSymbolsCandles)
    })
}

module.exports = {
    binance, loadCandles,
    listenToPriceChange, getPeriodsChanges, getSymbolsChanges,
    getChangeFrom, changePercent, change, publishPerf,
    DEFAULT_PERIODS, DURATION, timeframeStartAt

}