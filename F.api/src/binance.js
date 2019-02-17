// @flow
//const QUOTE_ASSET="BTC";
// const QUOTE_ASSET_REGEX = /usd|pax/i;
const QUOTE_ASSET_REGEX = /btc$/i;
// const QUOTE_ASSET="USDT";
const _ = require('lodash');
const { publish } = require('common/redis');
// var term = require('terminal-kit').terminal;
// const log = console.log;
// console.log = (...args) => {
//     console.clear();
//     term.move(0, 0, args.join(' '))
// }


const binance = require('./init-binance')
publish.throttle = _.throttle(publish, 1e3);

const satoshi = 1e-8
const durations = _.mapValues({
    '1m': 1, '2m': 2, '3m': 3, '5m': 5, '15m': 15, '30m': 30, '1h': 60, '2h': 120,
    '4h': 240, '6h': 360, '8h': 480, '12h': 720, '24h': 1440,
}, duration => duration * 60 * 1e3);

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

function binanceCandlesticks({ symbol, interval, startTime, limit = 1000 }) {
    return new Promise(((resolve, reject) => {
        binance.candlesticks(symbol, interval, (error, ticks, symbol) => {
            if (error) return reject(error);
            let last_tick = _.last(ticks);
            let closeTime = last_tick && last_tick[6];

            resolve({ closeTime, ticks });
        }, { startTime, limit });
    }));
}

async function getPrevCandles(symbol, interval = '1m', limit = 1440) {
    // $FlowFixMe
    let { ticks: ticks1, closeTime } = await binanceCandlesticks({
        symbol, interval, startTime: Date.now() - limit * 60 * 1e3
    });
    // $FlowFixMe
    let { ticks: ticks2 } = closeTime ? await binanceCandlesticks({
        symbol, interval, startTime: closeTime
    }) : { ticks: [] };

    return indexTicksByTime([...ticks1, ...ticks2]);
}

function updatePerf({ symbol, prevCandles, prevPerf }) {
    binance.websockets.candlesticks(symbol, '1m', (candlesticks) => {
        let { e: eventType, E: eventTime, s: symbol, k: ticks } = candlesticks;
        let {
            t: startTime, x: isFinal, i: interval, t: time, o: open, h: high, l: low, c: close, v: volume, T: closeTime,
            assetVolume, n: trades,/*V: buyBaseVolume,q: buyAssetVolume, ignored*/
        } = ticks;
        // console.log(symbol + " " + interval + " candlestick update");
        publish('price', { symbol, close });

        if (changePercent(close, +close + satoshi) < .6) {
            prevPerf[symbol] = getPrevPerformance({ prevCandles, symbol, ticks });
        } else return;

        if (isFinal) {
            console.log(symbol + ' final');
            const ONE_MIN = 1e3 * 60;
            let prevTime = startTime - (durations['24h'] + 10 * ONE_MIN);
            delete prevCandles[symbol][prevTime];
            prevCandles[symbol][startTime] = {
                time, open, high, low, close, volume, closeTime,
                assetVolume, trades,/*V: buyBaseVolume,q: buyAssetVolume, ignored*/
            }
        }
        publish.throttle('prevPerf', Object.values(prevPerf)
            .map(perfs =>
                _.mapKeys(perfs, (perf, period) =>
                    period[0] === '_' || period === 'day' ? period : _.last(period) + _.initial(period).join(''))));

    });
}

function getPrevPerformance({ prevCandles, symbol, ticks }) {
    let {
        t: startTime, o: open, h: high, l: low, c: close, v: volume,
        n: trades, i: interval, x: isFinal, q: quoteVolume, V: buyVolume,
        Q: quoteBuyVolume
    } = ticks;
    if (!prevCandles[symbol]) return;


    const perfs = _.reduce(durations, (prev, duration, period) => {
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

        const prevCandles = {};
        const prevPerf = {};
        (async function getPrev(symbols) {
            const errors = [];
            for (const symbol of symbols) {
                try {
                    console.log(symbol, 'loading previous candles');
                    prevCandles[symbol] = await getPrevCandles(symbol);
                    await updatePerf({ symbol, prevCandles, prevPerf });
                    console.log(symbol + " candlestick update");
                } catch (e) {
                    console.log(symbol, e.message);
                    errors.push(symbol);
                }
            }
            setTimeout(() => getPrev(errors), 30 * 1e3)
        }(symbols))
    }
});