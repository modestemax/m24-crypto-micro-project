const debug = require('debug')('B:strategy:bbema150-15M');
const { candleUtils } = require('common');
const { getNewCandleId, loadPoints, valuePercent, computeChange } = candleUtils;

const Template = require('./K3SCALPING.strategy');


module.exports = class extends Template {

    async canBuy({ symbolId, timeframe }, last, prev, signal) {
        const [currentH1, lastH1, candleH1_2] = (await loadPoints({ symbolId, timeframe: 60 })).reverse();
        let current = signal.candle;
        if (last && prev && current && currentH1 && lastH1) {

            if (current.ema10 <= current.bbb20)
                if ((current.close < current.ema10) && (current.bbu20 / current.close >= 0.7))
                    if (((current.ema20 >= current.bbb20) && (current.ema20 <= current.ema30)) || ((current.ema20 < current.bbb20) && (current.ema20 > current.ema30)))
                        if ((current.macd > current.macd_signal) && (last.macd >= last.macd_signal) && (last.macd_distance > prev.macd_distance) && (current.macd_distance > last.macd_distance))
                            if ((lastH1.plus_di > lastH1.minus_di) && (currentH1.plus_di > currentH1.minus_di) && (currentH1.adx >= lastH1.adx)) {
                                let ticker = await this.getTicker({ symbolId });
                                if (ticker && ticker.bid) {
                                    debug(`${symbolId} BID AT ${ticker.bid}`);
                                    return ticker.bid;
                                }
                            }
        }
    }
    async canSell({ symbolId, timeframe }, last, prev, signal) {
        let current = signal.candle;
        if (current.close >= current.bbu20) {
            let ticker = await this.getTicker({ symbolId });
            if (ticker && ticker.bid) {
                debug(`${symbolId} ASK AT ${ticker.bid}`);
                return ticker.bid;
            }
        }
    }
}
