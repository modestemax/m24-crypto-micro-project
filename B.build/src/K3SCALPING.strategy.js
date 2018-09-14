const debug = require('debug')('B:strategy:bbema150-15M');

const Template = require('./strategyBase');

module.exports = class extends Template {

    async canBuy({ symbolId, timeframe }, last, prev, signal) {
        let current = signal.candle;
        if (last && prev && current) {
            if (prev.ema50 > prev.bbb20) {
                if (current.ema10 <= current.bbb20)
                    if ((current.close < current.ema10) && (current.bbu20 / current.close >= 1))
                        if ((current.ema20 >= current.bbb20) && (current.ema20 <= current.ema30) || (current.ema20 < current.bbb20) && (current.ema20 > current.ema30))
                            if ((current.macd > current.macdSignal) || (current.macd > 0)) {
                                let ticker = await this.getTicker({ symbolId });
                                if (ticker && ticker.ask) {
                                    debug(`${symbolId} BID AT ${ticker.ask}`);
                                    return ticker.ask;
                                }
                            }
            }
        }
    }
};

// if(current.ema10 <= current.bbb20)
// if((current.close < current.ema10) && (current.bbu20 / current.close >= 1))
//   if((current.ema20 >= current.bbb20) && (current.ema20 <= current.ema30 ) || (current.ema20 < current.bbb20) && (current.ema20 > current.ema30) && (current.ema20 >= current.ema10))
//     if((current.macd > current.macdSignal) || (current.macd > 0))
//     if((current.macd_1h > current.macdSignal_1h) || (current.macd_1h - last.macdSignal_1h > 0))