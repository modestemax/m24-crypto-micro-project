// @flow
//const QUOTE_ASSET="BTC";
// const QUOTE_ASSET_REGEX = /usd|pax/i;
const QUOTE_ASSET_REGEX = /btc$/i;
// const QUOTE_ASSET="USDT";
const _ = require('lodash');
const { publish } = require('common/redis');


const binance = require('./init-binance')
publish.throttle = _.throttle(publish, 1e3);

// const _1MIN = 1e3 * 60;
// const _1H = _1MIN * 60;
// const _24H = _1H * 24;
const MAX_SPREAD = .6
const SATOSHI = 1e-8
const candles = {}

const DURATION = {
    MIN_1: 1, MIN_2: 2, MIN_3: 3, MIN_5: 5, MIN_15: 15, MIN_30: 30,
    HOUR_1: 60, HOUR_2: 120, HOUR_4: 240, HOUR_6: 360, HOUR_8: 480, HOUR_12: 720, HOUR_24: 1440,
}
Object.keys(DURATION).forEach(duration => DURATION[duration] *= 60 * 1e3)

const change = (open, close) => (close - open) / open;
const changePercent = (open, close) => change(open, close) * 100;

function indexTicksByTime(ticks) {
    return ticks.reduce((ticks, tick) => {
        let [time, open, high, low, close, volume, closeTime, assetVolume,
            trades, buyBaseVolume, buyAssetVolume, ignored] = tick;
        return {
            ...ticks,
            [time]: {
                time, open, high, low, close, volume, closeTime,
                assetVolume, trades, buyBaseVolume, buyAssetVolume, ignored
            }
        }
    }, {});
}


/**
 * get prev candle & index them by open time
 * @param symbol
 * @param interval
 * @param limit
 * @returns {Promise<*>}
 */
async function loadCandles(symbol, interval = '1m', limit = 1440) {
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
    binance.websockets.candlesticks(symbol, '1m', ({ ticks }) => {
        let {
            t: startTime, x: isFinal, i: interval, t: time, o: open, h: high, l: low, c: close, v: volume, T: closeTime,
            assetVolume, n: trades,/*V: buyBaseVolume,q: buyAssetVolume, ignored*/
        } = ticks;
        // console.log(symbol + " " + interval + " candlestick update");
        publish('price', { symbol, close });

        // if (changePercent(close, +close + SATOSHI) < MAX_SPREAD) {
        //     prevPerf[symbol] = getPrevPerformance({ candles, symbol, ticks });
        // } else return;
        addOrUpdateCandle({
            symbol, startTime, candle: {
                isFinal,
                time, open, high, low, close, volume, startTime, closeTime,
                assetVolume, trades,/*V: buyBaseVolume,q: buyAssetVolume, ignored*/
                // change:changePercent(open,close)
            }
        })

        if (isFinal) {
            console.log(symbol + ' final');
            forgetOldCandle(symbol)
        }
    });
}

function addOrUpdateCandle({ symbol, startTime, candle }) {
    candles[symbol][startTime] = candle
}

function publishPerf() {
    publish.throttle('prevPerf', Object.values(prevPerf)
        .map(perfs =>
            _.mapKeys(perfs, (perf, period) =>
                period[0] === '_' || period === 'day' ? period : _.last(period) + _.initial(period).join(''))));

}

/**
 * forget candle older than 24h
 */
function forgetOldCandle(symbol) {
    if (candles[symbol]) {
        const now = Date.now();
        const time = now - now % DURATION.MIN_1
        let oldTime = time - (DURATION.HOUR_24 + DURATION.MIN_5);
        delete candles[symbol][oldTime];
    }
}

function getPrevPerformance({ candles, symbol, ticks }) {
    let {
        t: startTime, o: open, h: high, l: low, c: close, v: volume,
        n: trades, i: interval, x: isFinal, q: quoteVolume, V: buyVolume,
        Q: quoteBuyVolume
    } = ticks;
    if (!prevCandles[symbol]) return; //no candle for symbol


    const perfs = _.reduce(DURATION, (prev, duration, period) => {
        let prevTime = startTime - duration;
        let prevCandle = prevCandles[symbol][prevTime];
        prevCandle = prevCandle || (period === '24h' ? _.values(prevCandles[symbol])[0] : prevCandle);

        return prevCandle ? {
            ...prev, [period]: {
                symbol, period, close, time: startTime, time_f: new Date(startTime),
                change: changePercent(prevCandle.open, close)
            }
        } : prev;
    }, {});

    const unJour = 24 * 60 * 60 * 1000;
    let now = Date.now();
    Object.entries({
        _1m: 1,
        _2m: 2,
        _3m: 3,
        _5m: 5,
        _15m: 15,
        _30m: 30,
        _1h: 60,
        _2h: 120,
        _4h: 240,
        _6h: 360,
        _8h: 480,
        _12h: 720,
        _24h: 1440
    })
        .map(([period, durationMinutes]) => {
            let duration = durationMinutes * 60 * 1000
            let openCandle = prevCandles[symbol][now - now % duration];
            perfs[period] = { symbol, period, change: +(openCandle && changePercent(openCandle.open, close)) }
        })
    // let dayOpenCandle = prevCandles[symbol][now - now % unJour];

    perfs['day'] = perfs['_24h']
    return perfs;
}

function getScreener({ symbol, period, from }) {
const startTime=from

        let prevTime = startTime - duration;
        let prevCandle = prevCandles[symbol][prevTime];
        prevCandle = prevCandle || (period === '24h' ? _.values(prevCandles[symbol])[0] : prevCandle);

        return prevCandle ? {
            ...prev, [period]: {
                symbol, period, close, time: startTime, time_f: new Date(startTime),
                change: changePercent(prevCandle.open, close)
            }
        } : prev;

    const unJour = 24 * 60 * 60 * 1000;
    let now = Date.now();
    Object.entries({
        _1m: 1,
        _2m: 2,
        _3m: 3,
        _5m: 5,
        _15m: 15,
        _30m: 30,
        _1h: 60,
        _2h: 120,
        _4h: 240,
        _6h: 360,
        _8h: 480,
        _12h: 720,
        _24h: 1440
    })
        .map(([period, durationMinutes]) => {
            let duration = durationMinutes * 60 * 1000
            let openCandle = prevCandles[symbol][now - now % duration];
            perfs[period] = { symbol, period, change: +(openCandle && changePercent(openCandle.open, close)) }
        })
    // let dayOpenCandle = prevCandles[symbol][now - now % unJour];

    perfs['day'] = perfs['_24h']
    return perfs;
}

//startup
binance.exchangeInfo(async function ex_info(error, data) {

    if (error) {
        console.log(error);
        binance.exchangeInfo(ex_info)
    } else {
        // const symbols = ['ETHBTC', 'ADABTC'];
        const symbols = data.symbols
            .filter(s => s.status === "TRADING")
            .filter(s => QUOTE_ASSET_REGEX.test(s.quoteAsset))
            .map(s => s.symbol);

        // const candles = {};
        // const prevPerf = {};
        (async function start(symbols) {
            const errors = [];
            for (const symbol of symbols) {
                try {
                    console.log(symbol, 'loading previous candles');
                    candles[symbol] = await loadCandles(symbol);
                    await listenToPriceChange(symbol);
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