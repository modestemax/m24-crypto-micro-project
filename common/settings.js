const defaultStrategyOptions = {
    isActive: false,
    selfStop: false,
    timeInForce: 'FOK',
    bidMarket: false,
    takeProfit: 1.2,
    stopLoss: -3,
    trailingStop: 1.5,
    cancelBidAfterSecond: 60 * 20,//1hour,
    ownerTelegramChatId: "475514014",//"@modestemax";
};

module.exports = {
    MAX_TRADE_COUNT_PER_STRATEGY: 3,
    MAX_TRADE_COUNT: 5,
    defaultStrategyOptions,
    strategies: filterActive({
        "testEma01": {
            timeInForce: 'GTC',
            cancelBidAfterSecond: 30,
            isActive: process.env.NODE_ENV != 'production',
            // isActive: false
        },
        "emaH1H4": {
            timeframe: 4 * 60,
            timeInForce: 'GTC',
            takeProfit: null,
            trailingStop: 1,
            // isActive: true,
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
            isActive: true,
            bidMarket: true
        },
        "BBEMA180H1": {
            timeframe: 60,
            timeInForce: 'FOK',
            isActive: true,
            bidMarket: true
        },
        "BBEMA30M15": {
            timeframe: 60,
            timeInForce: 'GTC',
            isActive: true,
            bidMarket: true
        },
        "BBEMA30H1": {
            timeframe: 60,
            timeInForce: 'GTC',
            isActive: true,
            bidMarket: true
        },
        "BBEMA3010M15": {
            timeframe: 60,
            timeInForce: 'GTC',
            isActive: true,
            bidMarket: true
        },
        "BBEMA3010H1": {
            timeframe: 60,
            timeInForce: 'GTC',
            isActive: true,
            bidMarket: true
        },
        "BBEMA20M15": {
            timeframe: 60,
            timeInForce: 'GTC',
            isActive: true,
            bidMarket: true
        },
        "BBEMA20H1": {
            timeframe: 60,
            timeInForce: 'GTC',
            isActive: true,
            bidMarket: true
        },
        "binance24h": {
            isActive: true,
            timeInForce: 'GTC',            
            selfStop: true
        },
          "m24Scalping": {
            isActive: false,
            timeInForce: 'GTC',            
            selfStop: true,
            cancelBidAfterSecond: 60 * 5,
        }
    }),
};

function filterActive(objects) {
    const result = {};
    for (key in objects) {
        if (objects[key].isActive) {
            result[key] = Object.assign({}, defaultStrategyOptions, objects[key]);
        }
    }
    return result;
}