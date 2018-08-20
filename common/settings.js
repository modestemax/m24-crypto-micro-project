const  defaultStrategyOptions= {
    isActive: false,
    timeInForce: 'FOK',
    bidMarket: false,
    takeProfit: 1,
    stopLoss: -2,
    trailingStop: 3,
    cancelBidAfterSecond: 60 * 60,//1hour,
    ownerTelegramChatId: "475514014",//"@modestemax";
};

module.exports = {
    MAX_TRADE_COUNT_PER_STRATEGY: 3,
    defaultStrategyOptions,
    strategies: filterActive({
        "testEma01": {
            timeInForce: 'GTC',
            takeProfit: 1,
            stopLoss: -2,
            trailingstop: 0,
            cancelBidAfterSecond: 30,
            // isActive: process.env.NODE_ENV != 'production',
            isActive: false
        },
        "emaH1H4": {
            timeframe: 4 * 60,
            timeInForce: 'GTC',
            takeProfit: null,
            trailingStop: 1,
            isActive: true,
        },
        "bbemaH1": {
            timeframe: 60,
            timeInForce: 'FOK',
            takeProfit: 5,
            stopLoss: -3,
            trailingStop: 2,
            isActive: false,
            bidMarket: true
        },
        "BBEMA150-15M": {
            timeframe: 15,
            timeInForce: 'FOK',
            takeProfit: 5,
            stopLoss: -3,
            trailingStop: 2,
            isActive: true,
            bidMarket: true
        },
        "BBEMA150-1H": {
            timeframe: 60,
            timeInForce: 'FOK',
            takeProfit: 5,
            stopLoss: -3,
            trailingStop: 2,
            isActive: true,
            bidMarket: true
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