const debug = require('debug')('B:strategy:bbema150-15M');
const { candleUtils } = require('common');
const { getNewCandleId,loadPoints } = candleUtils;

const Template = require('./strategyBase');


module.exports = class extends Template {

    async canBuy({ symbolId, timeframe }, last, prev, signal) {
        const [currentH1, lastH1, candleH1_2] = (await loadPoints({ symbolId, timeframe: 60 })).reverse();
        let current = signal.candle;
        if (last && prev && current && currentH1 && lastH1) {

            if (current.ema10 <= current.bbb20)
                if ((current.close < current.ema10) && (current.bbu20 / current.close >= 1))
                    if ((current.ema20 >= current.bbb20) && (current.ema20 <= current.ema30) || (current.ema20 < current.bbb20) && (current.ema20 > current.ema30) && (current.ema20 >= current.ema10))
                        if ((current.macd > current.macdSignal) || (current.macd > 0))
                            if ((currentH1.macd > currentH1.macdSignal) || (currentH1.macdDistance > lastH1.macdDistance)) {
                                let ticker = await this.getTicker({ symbolId });
                                if (ticker && ticker.ask) {
                                    debug(`${symbolId} BID AT ${ticker.ask}`);
                                    return ticker.ask;
                                }
                            }
        }
    }
}
