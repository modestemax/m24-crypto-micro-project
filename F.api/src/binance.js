
const _ = require('lodash')
const auth = require(process.env.HOME + '/.api.json').KEYS;
const { publish } = require('common/redis')
const getBinance = () => require('node-binance-api')().options({
    APIKEY: auth.api_key,
    APISECRET: auth.secret,
    useServerTime: true, // If you get timestamp errors, synchronize to server time at startup
    test: true // If you want to use sandbox mode where orders are simulated
});

const change = (open, close) => (close - open) / open * 100;

const intervalToInt = (interval) => {
    switch (interval) {
        case '1m': return 1;
        case '3m': return 3;
        case '5m': return 5;
        case '15m': return 15;
        case '30m': return 30;
        case '1h': return 60;
        case '2h': return 120;
        case '4h': return 240;
        case '6h': return 360;
        case '8h': return 480;
        case '12h': return 720;
        case '1d': return 1440;
        case '3d': return 4320;
        case '1w': return 10080;
        case '1M': return 43200;

    }
}
const binance = getBinance();

binance.exchangeInfo(function (error, data) {
    if (!error) {
        const symbols = data.symbols
            .filter(s => s.status === "TRADING")
            .filter(s => s.quoteAsset === "BTC")
            .map(s => s.symbol);
        const klines = {}
        //Periods: 1m,3m,5m,15m,30m,1h,2h,4h,6h,8h,12h,1d,3d,1w,1M
        const periods = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d'];
        periods.forEach(period => {
            // const binance =getBinance();
            const periodKlines = {}
            let periodKlinesOrdered;
            binance.websockets.candlesticks(symbols, period, (candlesticks) => {
                let { e: eventType, E: eventTime, s: symbol, k: ticks } = candlesticks;
                let { o: open, h: high, l: low, c: close, v: volume, n: trades, i: interval, x: isFinal, q: quoteVolume, V: buyVolume, Q: quoteBuyVolume } = ticks;
                console.log(symbol + " " + interval + " candlestick update");
                // console.log("open: " + open);
                // console.log("high: " + high);
                // console.log("low: " + low);
                // console.log("close: " + close);
                // console.log("volume: " + volume);
                // console.log("isFinal: " + isFinal);

                periodKlines[symbol] = {
                    symbolId: symbol, open, high, low, close, interval,
                    timeframe: intervalToInt(interval),
                    change_from_open: change(open, close),
                    change_to_high: change(open, high),
                    //spread:change
                    //spread_percentage
                };

                klines[period] = _.orderBy(Object.values(periodKlines), ['change_from_open'], 'desc')
                    .map((k, position) => ({ ...k, position:++position }));
                publish('klines', klines[period])
            });

        })
    }
})