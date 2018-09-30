const defaultStrategyOptions = {
    isActive: false,
    selfStop: false,
    timeInForce: 'FOK',
    bidMarket: false,
    takeProfit: 1,
    stopLoss: -3,
    trailingStop: 1.5,
    cancelBidAfterSecond: 60 * 20,//20 min,
    ownerTelegramChatId: "475514014",//"@modestemax";
    doTrade: false,
};

module.exports = {
    MAX_TRADE_COUNT_PER_STRATEGY: 3,
    MAX_TRADE_COUNT: 4,
    defaultStrategyOptions,
    strategies: filterActive({
        pc: {
            isActive: true, virtual: true
        },
        web: {
            isActive: true, virtual: true
        },
        "testEma01": {
            timeframe: 15,
            timeInForce: 'GTC',
            cancelBidAfterSecond: 30,
            // isActive: process.env.NODE_ENV != 'production',
            // isActive: false
        },
        "emaH1H4": {
            timeframe: 4 * 60,
            timeInForce: 'GTC',
            // isActive: true,
        },
        "macdH1H4": {
            timeframe: 4 * 60,
            timeInForce: 'GTC',
            // isActive: true,
            // doTrade: true,
            takeProfit: 2,
        },
        "bbemaH1": {
            timeframe: 60,
            timeInForce: 'FOK',
            // isActive: false,
            bidMarket: true
        },
        "BBEMA150M15": {
            timeframe: 15,
            timeInForce: 'FOK',
            // isActive: false,
            bidMarket: true
        },
        "BBEMA150H1": {
            timeframe: 60,
            timeInForce: 'FOK',
            // isActive: false,
            bidMarket: true
        },
        "BBEMA180M15": {
            timeframe: 15,
            timeInForce: 'FOK',
            // isActive: true,
            bidMarket: true
        },
        "BBEMA180H1": {
            timeframe: 60,
            timeInForce: 'FOK',
            // isActive: true,
            bidMarket: true
        },
        "BBEMA30M15": {
            timeframe: 15,
            timeInForce: 'GTC',
            // isActive: true,
            bidMarket: true
        },
        "BBEMA30H1": {
            timeframe: 60,
            timeInForce: 'GTC',
            // isActive: true,
            bidMarket: true
        },
        "BBEMA3010M15": {
            timeframe: 15,
            timeInForce: 'GTC',
            // isActive: true,
            bidMarket: true
        },
        "BBEMA3010H1": {
            timeframe: 60,
            timeInForce: 'GTC',
            // isActive: true,
            bidMarket: true
        },
        "BBEMA20M15": {
            timeframe: 15,
            timeInForce: 'GTC',
            // isActive: true,
            bidMarket: true
        },
        "BBEMA20H1": {
            timeframe: 60,
            timeInForce: 'GTC',
            // isActive: true,
        },
        "BBEMA110": {
            timeframe: 15,
            timeInForce: 'GTC',
            doTrade: true,
            // isActive: true,
        },
        "K3EMA100": {
            timeframe: 15,
            timeInForce: 'GTC',
            isActive: false,
        },
        "K3BBEMA70M15": {
            timeframe: 15,
            timeInForce: 'GTC',
            // isActive: true,
        },
        "K3BBEMA70H1": {
            timeframe: 60,
            timeInForce: 'GTC',
            // isActive: true,
        },
        "K3EMA50": {
            timeframe: 15,
            timeInForce: 'GTC',
            isActive: false,
        },
        "binance24h": {
            // isActive: true,
            doTrade: false,
            timeInForce: 'IOC',
            selfStop: true,
            timeframe: 15,
            takeProfit: .5
        },
        "m24Scalping": {
            // isActive: true,
            doTrade: false,
            timeInForce: 'IOC',
            selfStop: true,
            timeframe: 15,
            takeProfit: .25,
        },
        "K3SCALPINGM15": {
            isActive: true,
            doTrade: true,
            timeInForce: 'GTC',
            selfStop: true,
            timeframe: 15,
            timeframeX:60,
            takeProfit: .5,
            stopLoss: -1,
            cancelBidAfterSecond: 60 * 10,//5 min,

        },
        "K3SCALPINGM5": {
            isActive: true,
            doTrade: true,
            timeInForce: 'GTC',
            selfStop: true,
            timeframe: 5,
            timeframeX:15,
            takeProfit: .5,
            stopLoss: -1,
            cancelBidAfterSecond: 60 * 10,//5 min,
        },
        "K3SCALPINGM1": {
            isActive: true,
            doTrade: true,
            timeInForce: 'GTC',
            selfStop: true,
            timeframe: 1,
            timeframeX:5,
            takeProfit: .5,
            stopLoss: -1,
            cancelBidAfterSecond: 60 * 10,//5 min,
        },
          "K3SCALPINGUPM15": {
            isActive: true,
            // doTrade: true,
            timeInForce: 'GTC',
            selfStop: true,
            timeframe: 15,
            // timeframeX:5,
            takeProfit: .5,
            stopLoss: -1,
            cancelBidAfterSecond: 60 * 10,//5 min,
        },
       "K3SCALPINGBBM5": {
            isActive: true,
            // doTrade: true,
            timeInForce: 'GTC',
            selfStop: true,
            timeframe: 5,
            // timeframeX:5,
            takeProfit: .5,
            stopLoss: -.5,
            cancelBidAfterSecond: 60 * 10,//5 min,
        },
           "K3B2SPIRITH1": {
            isActive: true,
            doTrade: false,
            timeInForce: 'GTC',
            selfStop: true,
            timeframe: 60,
            timeframeX:60*4,
            takeProfit: 4,
            cancelBidAfterSecond: 60 * 10,//5 min,
        },
        "K3B2SPIRITM5": {
            isActive: true,
            doTrade: false,
            timeInForce: 'GTC',
            selfStop: true,
            timeframe: 5,
            timeframeX:60,
            takeProfit: 4,
            cancelBidAfterSecond: 60 * 10,//5 min,
        },
        "K3DAILY1H": {
            isActive: false,
            doTrade: false,
            timeInForce: 'IOC',
            selfStop: true,
            timeframe: 60,
            takeProfit: 4,
        },
        "m24day": {
            // isActive: true,
            // doTrade: true,
            timeInForce: 'IOC',
            // selfStop: true,
            timeframe: 60 * 24,
            takeProfit: 5,
        },
        "m24ohlcv1d": {
            isActive: true,
            timeframe: 60 * 24,
            limit: 10,
            frame: '1d',
            minTarget: 2,
            takeProfit: 2,
            maxSpread:1
        },
        "m24ohlcv4h": {
            isActive: true,
            timeframe: 60 * 4,
            limit: 14,
            frame: '4h',
            minTarget: .5,
            takeProfit: .5,
            maxSpread:1
        },
        "m24ohlcv1h": {
            // isActive: true,
            timeframe: 60,
            limit: 10,
            frame: '1h',
            minTarget: .3,
            takeProfit: .3,
        },
        "m24ohlcv15m": {
            // isActive: true,
            timeframe: 15,
            frame: '15m',
            minTarget: .5
            // takeProfit: 5,
        }
    }),
};

function filterActive(objects) {
    const result = {};
    for (let key in objects) {
        objects[key].name = key;
        if (objects[key].isActive) {
            result[key] = Object.assign({}, Object.assign({}, defaultStrategyOptions), objects[key]);
        }
    }
    return result;
}