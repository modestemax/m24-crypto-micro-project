const debug = require('debug')('B:strategy:bbema150-15M');

const Template = require('./strategyBase');

module.exports = class extends Template {

    async canBuy({ symbolId, timeframe }, last, prev) {
        if (last && prev)
            if (prev.ema100 >= prev.ema10)
                if (last.ema100 < last.ema10)
                    if (last.ema10 >= last.bbb20)
                        if (last.macd > last.macdSignal)
                            if (last.close <= last.ema10) {
                                let ticker = await this.getTicker({  symbolId });
                                if (ticker && ticker.bid) {
                                    debug(`${symbolId} BID AT ${ticker.bid}`);
                                    return ticker.bid;
                                }
                                // this.pairFound({ side: 'BUY', symbolId, price: ticker.bid })
                            }
    }
};

