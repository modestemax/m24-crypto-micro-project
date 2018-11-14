
const _ = require('lodash')
const auth = require(process.env.HOME + '/.api.json').KEYS;
const { publish } = require('common/redis')
const getBinance = () => require('node-binance-api')().options({
    APIKEY: auth.api_key,
    APISECRET: auth.secret,
    useServerTime: true, // If you get timestamp errors, synchronize to server time at startup
    test: true // If you want to use sandbox mode where orders are simulated
});

const change = (open, close) => (close - open) / open;
const changePercent = (open, close) => change(open, close) * 100;

const orderBy = (array, prop, orderProp = 'position') => _(array).orderBy([prop], 'desc')
    .map((k, position) => ({ ...k, [orderProp]: ++position })).value()

const orderByGoodSpread = (array, prop) => {
    let array2 = _.mapKeys(orderBy(array, prop), 'symbol');
    let array3 = _.mapKeys(orderBy(_.filter(array2, a => a['spread_percentage'] < MAX_SPREAD), prop, 'position_good_spread'), 'symbol')
    return _.values({ ...array2, ...array3 })
}
const klines = {}
const setKlines = (interval, iKlines) => {
    klines[interval] = iKlines

}

const computeBonus=()=>{
    let bonus = _.map(symbols, symbol => {
        let bonus = [...periods, PREV_DAY_INTERVAL].reduce(({ green, prevDay, change }, interval) => {
            let kline = _.get(klines[interval], symbol);
            if (kline) {
                green += kline.green ? 1 : 0;
                prevDay += interval === PREV_DAY_INTERVAL ?
                    (kline.change_from_open > MIN_CHANGE_PREV_DAY ? 5 : 0) : 0;
                change += 2 * (kline.change_from_open / _.maxBy(klines[interval], 'change_from_open'))

            }
        }, { green: 0, prevDay: 0, change: 0 })
        return bonus;
    });
    return bonus;
}

const PREV_DAY_INTERVAL = '24h';
const MAX_SPREAD = .8;
const MIN_CHANGE_PREV_DAY = 2;

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

        const prevDayKlines = {};
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

                periodKlines[symbol] = {
                    symbol, open, high, low, close, interval,
                    timeframe: intervalToInt(interval),
                    change_from_open: changePercent(open, close),
                    change_to_high: changePercent(open, high),
                    isFinal, volume,
                    spread_percentage: _.get(prevDayKlines[symbol], 'spread_percentage'),
                    green: close > open
                };

                setKlines(interval, orderByGoodSpread(periodKlines, 'change_from_open'));
            });

        })

        // For all symbols:
        binance.websockets.prevDay(symbols, (error, response) => {
            let { symbol, open, high, low, close, bestAsk, bestBid, percentChange: change_from_open } = response;
            console.log(symbol + " " + "prevDay update");
            prevDayKlines[symbol] = {
                symbol, interval: PREV_DAY_INTERVAL,
                open: +open, high: +high, low: +low, close: +close,
                bestAsk: +bestAsk, bestBid: +bestBid,
                change_from_open: +change_from_open,
                spread_percentage: changePercent(bestBid, bestAsk),
                green: +close > +open
            }
            setKlines(PREV_DAY_INTERVAL, orderByGoodSpread(prevDayKlines, 'change_from_open'));
            // });
        });

       computeBunus()

        setInterval(() => publish('klines', _.map(klines, (klines, interval) => ({ interval, klines }))), 1e3)
    }
})