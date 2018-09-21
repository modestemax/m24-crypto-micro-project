const debug = require('debug')('B:strategy:bbema150-15M');
const { candleUtils } = require('common');
const { getNewCandleId, loadPoints, valuePercent, computeChange } = candleUtils;

const Template = require('./K3SCALPING.strategy');


module.exports = class extends Template {

    async canBuy({ symbolId, timeframe }, last, prev, signal) {
        const [currentM15, lastM15] = (await loadPoints({ symbolId, timeframe: 15 })).reverse();
        let current = signal.candle;
        if (last && prev && current && currentM15 && lastM15) {

            if (current.ema10 <= current.bbb20)
                if ((current.close < current.ema10) && (current.bbu20 / current.close >= 0.7))
                    if (((current.ema20 > current.bbb20) && (current.ema20 <= current.ema30)) || ((current.ema20 < current.bbb20) && (current.ema20 > current.ema30)))
                        if ((current.macd > current.macd_signal) || ((current.macd > 0) && (current.ema20 > current.ema30) && (last.ema20 > prev.ema20) && (current.ema20 > last.ema20)))
                            if ((currentM15.plus_di > lastM15.minus_di) && (currentM15.plus_di > currentM15.minus_di) && (currentM15.adx >= lastM15.adx || currentM15.adx > 20)) {
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
