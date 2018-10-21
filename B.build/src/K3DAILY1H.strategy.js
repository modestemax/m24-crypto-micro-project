const debug = require('debug')('B:strategy:bbema150-15M');
const { candleUtils } = require('common');
const { getNewCandleId, loadPoints, valuePercent, computeChange } = candleUtils;

const Template = require('./strategyBase');


module.exports = class extends Template {

    async canBuy({ symbolId, timeframe }, last, prev, signal) {
        // const [currentH1, lastH1, candleH1_2] = (await loadPoints({ symbolId, timeframe: 60 }));
        let current = signal.candle;
        if (last && prev && current) {

            if ((last.macd > last.macd_signal) && (current.macd > current.macd_signal) && (prev.macd > prev.macd_signal))
                if ((current.macd_distance >= last.macd_distance) && (current.macd > 0))
                    if ((last.ema20 > last.bbb20) && (last.ema10 > last.ema20) && (last.ema30 >= last.bbb20))
                        if ((last.ema20 >= last.ema30) && (current.ema20 > current.ema30))
                            if ((current.ema10 > current.ema20) && (current.ema20 > current.bbb20) && (current.ema30 >= current.bbb20))
                                if ((current.ema50 <= current.ema10) && (last.ema50 <= last.ema10))
                                    if ((current.plus_di > current.minus_di) && (current.adx > current.minus_di) && (current.adx >= last.adx))
                                    // if ((current.close <= current.bbu20))
                                    {
                                        let ticker = await this.getTicker({ symbolId });
                                        if (ticker && ticker.ask) {
                                            debug(`${symbolId} BID AT ${ticker.ask}`);
                                            return ticker.ask;
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
    getSellPriceIfSellable(rawAsset) {
        const { change, maxChange, openPrice, closePrice, symbolId, timestamp } = rawAsset;
        const H1 = 1e3 * 60 * 60;

        const duration = Date.now() - timestamp;
        if (change > .3 && maxChange > change) {
            return closePrice;
        } else if (-2.5 < change && change < -2) {
            return valuePercent(openPrice, -.5)
        } else if (change < -2.8) {
            return true
        } else if (duration > H1 && change >= .3) {
            return closePrice;
        } else if (duration > 2 * H1 && change > .15) {
            return closePrice;
        } else if (duration > 2.5 * H1 || duration > 2 * H1 && change < .15) {
            return true
        } else {
            return valuePercent(openPrice, .7);
        }
    }
}
