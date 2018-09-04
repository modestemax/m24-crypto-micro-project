const debug = require('debug')('B:strategy:bbema150-15M');

const Template = require('./strategyBase');

module.exports = class extends Template {

    async canBuy({ exchange, symbolId, timeframe }, last, prev) {
        // const signalH1_1 = await this.findSignal({ exchange, symbolId, timeframe: 60, position: 1 });
        // const prev = signalH1_1 && signalH1_1.candle;
        if (last && prev)
            if (prev.ema100 <= prev.bbb20)
                if (last.ema100 > last.bbb20)
                    if (last.macd < last.macdSignal)
                        if (prev.ema10 <= prev.bbb20 && last.ema10 <= last.bbb20)
                            if ((last.ema200 < last.ema100 && last.ema30 >= last.bbb20 && last.ema20 <= last.bbb20) || (last.ema200 > last.ema100 && last.ema50 < last.bbb20))
                                if (last.close <= prev.bbb20) {
                                    let ticker = await this.getTicker({ exchange, symbolId });
                                    if (ticker && ticker.bid) {
                                        debug(`${symbolId} BID AT ${ticker.bid}`);
                                        return ticker.bid;
                                    }
                                    // this.pairFound({ side: 'BUY', symbolId, price: ticker.bid })

                                }
    }
    canSell({ exchange, symbolId, timeframe }, last, prev, signal) {
        if (last && prev)
            if ((prev.ema100 >= prev.bbb20 && last.ema100 < last.bbb20) || (prev.ema200 >= prev.bbb20 && last.ema200 < last.bbb20)) {
                let ticker = await this.getTicker({ exchange, symbolId });
                if (ticker && ticker.ask) {
                    debug(`${symbolId} BID AT ${ticker.ask}`);
                    return ticker.ask;
                }
            }
    }
};

