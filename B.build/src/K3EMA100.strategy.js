const debug = require('debug')('B:strategy:bbema150-15M');

const Template = require('./strategyBase');

module.exports = class extends Template {

    async canBuy({ symbolId, timeframe }, last, prev) {
        if (last && prev)
            if (prev.ema100 <= prev.bbb20)
                if (last.ema100 > last.bbb20)
                    if (last.macd < last.macdSignal)
                        if (prev.ema10 <= prev.bbb20 && last.ema10 <= last.bbb20)
                            if ((last.ema200 < last.ema100 && last.ema30 >= last.bbb20 && last.ema20 < last.bbb20) || (last.ema200 > last.ema100 && last.ema50 < last.bbb20))
                                if (last.close <= last.ema10) {
                                    let ticker = await this.getTicker({ symbolId });
                                    if (ticker && ticker.bid) {
                                        debug(`${symbolId} BID AT ${ticker.bid}`);
                                        return ticker.bid;
                                    }
                                }
    }
    async   canSell({ symbolId, timeframe }, last, prev, signal) {
        if (last && prev)
            if (last.ema100 <= last.bbb20 || last.ema200 <= last.bbb20)
                if (last.close > last.ema10) {
                    let ticker = await this.getTicker({ symbolId });
                    if (ticker && ticker.ask) {
                        debug(`${symbolId} BID AT ${ticker.ask}`);
                        return ticker.ask;
                    }
                }
    }
};

