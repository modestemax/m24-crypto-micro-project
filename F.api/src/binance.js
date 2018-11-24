// @flow

const _ = require('lodash');
const auth = require((process.env.HOME || '~') + '/.api.json').KEYS;
const { publish } = require('common/redis');
const getBinance = () => require('node-binance-api')().options({
    APIKEY: auth.api_key,
    APISECRET: auth.secret,
    useServerTime: true, // If you get timestamp errors, synchronize to server time at startup
    test: true // If you want to use sandbox mode where orders are simulated
});

const binance = getBinance();

const durations = _.mapValues({
    '5m': 5, '15m': 15, '30m': 30, '1h': 60, '2h': 120,
    '4h': 240, '6h': 360, '8h': 480, '12h': 720, '24h': 1440,
}, duration => duration * 60 * 1e3);

const change = (open, close) => (close - open) / open;
const changePercent = (open, close) => change(open, close) * 100;

function indexTicksByTime(ticks) {
    return ticks.reduce((ticks, tick) => {
        let [time, open, high, low, close, volume, closeTime, assetVolume, trades, buyBaseVolume, buyAssetVolume, ignored] = tick;
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
        let { t: startTime, x: isFinal, i: interval, } = ticks;
        console.log(symbol + " " + interval + " candlestick update");

        prevPerf[symbol] = getPrevPerformance({ prevCandles, symbol, ticks })

        if (isFinal && prevCandles[symbol]) {
            let prevTime = startTime - durations['24h'];
            delete prevCandles[symbol][prevTime]
        }
        publish('prevPerf', Object.values(prevPerf));

    });
}

function getPrevPerformance({ prevCandles, symbol, ticks }) {
    let { t: startTime, o: open, h: high, l: low, c: close, v: volume,
        n: trades, i: interval, x: isFinal, q: quoteVolume, V: buyVolume,
        Q: quoteBuyVolume } = ticks;
    if (!prevCandles[symbol]) return;


    return _.reduce(durations, (prev, duration, period) => {
        let prevTime = startTime - duration;
        let prevCandle = prevCandles[symbol][prevTime];

        return prevCandle ? {
            ...prev, [period]: {
                symbol, period,
                change: changePercent(prevCandle.open, close)
            }
        } : prev;
    }, {});
}

binance.exchangeInfo(function (error, data) {
    if(error)
    console.log(error)
    else  {
        // const symbols = ['ETHBTC']
        const symbols = data.symbols
            .filter(s => s.status === "TRADING")
            .filter(s => s.quoteAsset === "BTC")
            .map(s => s.symbol);

        const prevCandles = {};
        const prevPerf = {};

        symbols.forEach(function getPrev(symbol) {
            getPrevCandles(symbol)
                .then(r => prevCandles[symbol] = r)
                .then(() => updatePerf({ symbol, prevCandles, prevPerf }))
                .catch((e) => console.log(e), setTimeout(() => getPrev(symbol), 30 * 1e3))
        });

    }
});