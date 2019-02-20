// @flow
//const QUOTE_ASSET="BTC";
// const QUOTE_ASSET_REGEX = /usd|pax/i;
const QUOTE_ASSET_REGEX = /btc$/i;
// const QUOTE_ASSET="USDT";
const _ = require('lodash');
const { publish, subscribe } = require('common/redis');


const binance = require('./init-binance')
publish.throttle = _.throttle(publish, 1e3);

// const _1MIN = 1e3 * 60;
// const _1H = _1MIN * 60;
// const _24H = _1H * 24;

const candles = {}
const symbols = []

const DURATION = {
    MIN_1: 1, MIN_2: 2, MIN_3: 3, MIN_5: 5, MIN_15: 15, MIN_30: 30,
    HOUR_1: 60, HOUR_2: 120, HOUR_4: 240, HOUR_6: 360, HOUR_8: 480, HOUR_12: 720, HOUR_24: 1440,
}
Object.keys(DURATION).forEach(duration => DURATION[duration] *= 60 * 1e3)

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
    day: () => Date.now() - Date.now() % DURATION.HOUR_24,
    H4: () => Date.now() - Date.now() % DURATION.HOUR_4,
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
function listenToPriceChange(symbol) {
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
            symbol, startTime, candle: {
                isFinal, interval,
                open, high, low, close, volume, startTime, closeTime,
                assetVolume, trades,/*V: buyBaseVolume,q: buyAssetVolume, ignored*/
                // change:changePercent(open,close)
            }
        })

        if (isFinal) {
            console.log(symbol + ' final');
            forgetOldCandles(symbol)
        }
    });
}

function addOrUpdateCandle({ symbol, startTime, candle }) {
    candles[symbol][startTime] = candle
}

/**
 * forget candle older than 24h
 */
function forgetOldCandles(symbol) {
    if (candles[symbol]) {
        const now = Date.now() - Date.now() % DURATION.MIN_1
        let oldTime = now - (DURATION.HOUR_24 + DURATION.MIN_15);
        Object.keys(candles[symbol]).forEach(time => time < oldTime && delete candles[symbol][oldTime])
    }
}

function getChangeFrom({ symbol, period, from, timeframeName }) {
    const now = Date.now() - Date.now() % DURATION.MIN_1;
    const now_1 = now - DURATION.MIN_1
    const startTime = from || (typeof period === 'function' ? period() : now - period)
    if (startTime && candles[symbol]) {
        const startCandle = candles[symbol][startTime];
        const lastCandle = candles[symbol][now] || candles[symbol][now_1];
        if (startCandle && lastCandle) {
            const [open, close] = [+startCandle.open, +lastCandle.close]
            return {
                symbol, timeframeName,
                open, close,
                change: changePercent(open, close)
            }
        }
        !startCandle && console.log(`${symbol} startCandle not found at [${startTime}] ${new Date(startTime)}`)
        !lastCandle && console.log(`${symbol} lastCandle not found at [${now}] ${new Date(now)}`)
    }
}

/**
 * get changes for all pairs in a defined period of time
 * @param period : duration in millisecond
 * @param from : start time
 * @param timeframeName
 * @returns {{}}
 */
function getSymbolsChanges({ period, from, timeframeName }) {
    return _.mapValues(candles, (_, symbol) => getChangeFrom({ symbol, period, from, timeframeName }))
}

/**
 * get changes for all periods of a given pair
 * @param symbol
 * @param periods :{M1:12938747000,}
 * @returns {{}}
 */
function getPeriodsChanges({ symbol, periods }) {
    return _.mapValues(periods, (period, timeframeName) => getChangeFrom({ symbol, period, timeframeName }))
}


function publishPerf(periods = DEFAULT_PERIODS) {
    const perfs = {}
    subscribe('price', ({ symbol }) => {
        const symbolPerfs = getPeriodsChanges({ symbol, periods });

        perfs[symbol] = _.mapValues(symbolPerfs, (perf, period) =>
            perf || (perfs[symbol] && perfs[symbol][period] && { isDirty: true, ...perfs[symbol][period] }))

        publish.throttle('prevPerf', Object.values(perfs))
    })
}

//startup
binance.exchangeInfo(async function ex_info(error, data) {

    if (error) {
        console.log(error);
        binance.exchangeInfo(ex_info)
    } else {
        // const symbols = ['ETHBTC', 'ADABTC'];
        symbols.push.apply(symbols, data.symbols
            .filter(s => s.status === "TRADING")
            .filter(s => QUOTE_ASSET_REGEX.test(s.quoteAsset))
            .map(s => s.symbol));

        publishPerf();

        (async function start(symbols) {
            const errors = [];
            for (const symbol of symbols) {
                try {
                    console.log(symbol, 'loading previous candles');
                    candles[symbol] = await loadCandles(symbol);
                    listenToPriceChange(symbol);
                    console.log(symbol + " candlestick started");
                } catch (e) {
                    console.log(symbol, e.message);
                    errors.push(symbol);
                }
            }
            setTimeout(() => start(errors), 30 * 1e3)
        }(symbols))
    }
});

module.exports = { binance, getPeriodsChanges, getSymbolsChanges, getChangeFrom, changePercent, change, publishPerf }