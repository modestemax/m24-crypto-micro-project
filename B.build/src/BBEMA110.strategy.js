const debug = require('debug')('B:strategy:bbema150-15M');

const Template = require('./strategyBase');

module.exports = class extends Template {

    async canBuy({ symbolId, timeframe }, last, prev) {
        if (last && prev)
            if (prev.ema100 >= prev.ema10 && last.ema100 < last.ema10)
                if (last.macd > last.macd_signal)
                    if (last.ema20 >= last.ema30)
                        if ((last.ema200 <= last.ema100 && last.ema50 <= last.ema10) || ((last.ema200 > last.ema100 && last.ema50 <= last.ema30)))
                            if (last.close < last.ema10) {
                                let ticker = await this.getTicker({ symbolId });
                                if (ticker && ticker.bid) {
                                    debug(`${symbolId} BID AT ${ticker.bid}`);
                                    return ticker.bid;
                                }
                            }
    }
};

