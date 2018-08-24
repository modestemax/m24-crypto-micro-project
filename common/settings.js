const defaultStrategyOptions = {
    isActive: false,
    timeInForce: 'FOK',
    bidMarket: false,
    takeProfit: 3,
    stopLoss: -3,
    trailingStop: 1.5,
    cancelBidAfterSecond: 60 * 60,//1hour,
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
        "BBEMA150-15M": {
            timeframe: 15,
            timeInForce: 'FOK',           
            // isActive: false,
            bidMarket: true
        },
        "BBEMA150-1H": {
            timeframe: 60,
            timeInForce: 'FOK',          
            // isActive: false,
            bidMarket: true
        },
        "BBEMA180-15M": {
            timeframe:15,
            timeInForce: 'FOK',         
            isActive: true,
            bidMarket: true
        },
        "BBEMA180-1H": {
            timeframe:60,
            timeInForce: 'FOK',          
            isActive: true,
            bidMarket: true
        },
        "binance-24h": {
            isActive: true,
            timeInForce: 'GTC',
            stopLoss: null,
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