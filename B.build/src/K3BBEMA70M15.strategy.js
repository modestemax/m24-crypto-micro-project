const debug = require('debug')('B:strategy:bbema150-15M');

const Template = require('./strategyBase');

module.exports = class extends Template {

    async canBuy({ symbolId, timeframe }, last, prev) {
        if (last && prev)
            if (prev.ema50 >= prev.ema20 && last.ema50 < last.ema20)
                if ((last.ema10 >= last.bbb20 && last.ema20 > last.ema30))
                    if ((last.macd > last.macdSignal) && (last.macd - prev.macdSignal >= 0))
                        if (last.macd_1h > last.macdSignal_1h)
                            if (last.close < last.bbu20) {
                                let ticker = await this.getTicker({ symbolId });
                                if (ticker && ticker.ask) {
                                    debug(`${symbolId} BID AT ${ticker.ask}`);
                                    return ticker.ask;
                                }
                            }
    }
};

