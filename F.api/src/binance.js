// @flow
//const QUOTE_ASSET="BTC";
// const QUOTE_ASSET_REGEX = /usd|pax/i;
const QUOTE_ASSET_REGEX = /btc$/i;
// const QUOTE_ASSET="USDT";
const _ = require('lodash');
const auth = require((process.env.HOME || '~') + '/.api.json').KEYS;
const { publish } = require('common/redis');
const getBinance = () => require('node-binance-api')().options({
    APIKEY: auth.api_key,
    APISECRET: auth.secret,
    useServerTime: true, // If you get timestamp errors, synchronize to server time at startup
    test: true // If you want to use sandbox mode where orders are simulated
});
publish.throttle = _.throttle(publish, 1e3);

const binance = getBinance();
const satoshi=1e-8
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

        if (changePercent(close, close + satoshi) < .6) {
            prevPerf[symbol] = getPrevPerformance({ prevCandles, symbol, ticks });
        }
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
                    _.last(period) + _.initial(period).join(''))));

    });
}

function getPrevPerformance({ prevCandles, symbol, ticks }) {
    let {
        t: startTime, o: open, h: high, l: low, c: close, v: volume,
        n: trades, i: interval, x: isFinal, q: quoteVolume, V: buyVolume,
        Q: quoteBuyVolume
    } = ticks;
    if (!prevCandles[symbol]) return;


    return _.reduce(durations, (prev, duration, period) => {
        let prevTime = startTime - duration;
        let prevCandle = prevCandles[symbol][prevTime];
        prevCandle = prevCandle || (period === '24h' ? _.values(prevCandles[symbol])[0] : prevCandle);

        return prevCandle ? {
            ...prev, [period]: {
                symbol, period,
                change: changePercent(prevCandle.open, close)
            }
        } : prev;
    }, {});
}

binance.exchangeInfo(async function (error, data) {
    if (error)
        console.log(error);
    else {
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