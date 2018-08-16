module.exports = {
    MAX_TRADE_COUNT_PER_STRATEGY: 5,

    strategies: filterActive({
        "testEma01": {
            timeInForce: 'GTC',
            takeProfit: 1,
            stopLoss: -2,
            trailingstop: 0,
            cancelBidAfterSecond: 30,
        },
        "emaH1H4": {
            timeInForce: 'GTC',
            takeProfit: null,
            trailingStop: 1,
            isActive: true,
        },
        "bbemaH1": {
            timeInForce: 'FOK',
            takeProfit: 15,
            stopLoss: null,
            trailingStop: null,
            isActive: true,
            bidMarket: true
        }
    }),

    defaultStrategyOptions: {
        isActive: false,
        timeInForce: 'FOK',
        bidMarket: false,
        takeProfit: 1,
        stopLoss: -2,
        trailingStop: 3,
        cancelBidAfterSecond: 60 * 60//1hour
    },  
};

function filterActive(objects) {
    const result = {};
    for (key in objects) {
        if (objects[key].isActive) {
            result[key] = objects[key];
        }
    }
    return result;
}