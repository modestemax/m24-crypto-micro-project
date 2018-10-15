const debug = require('debug')('B:strategy:bbema150-15M');
const { candleUtils } = require('common');
const { getNewCandleId, loadPoints, valuePercent, computeChange } = candleUtils;

const Template = require('./strategyBase');


module.exports = class extends Template {

    async canBuy({ symbolId, timeframe }, last, prev, signal) {
        const [currentX, lastX, prevX] = (await loadPoints({ symbolId, timeframe: this.options.timeframeX })).reverse();
        const [candle, candle_1, candle_2, candle_3, candle_4] = (await loadPoints({ symbolId, timeframe: this.options.timeframe })).reverse();
        let current = signal.candle;
        if (last && prev && current) {

            if ((last.ema50 > last.bbb20) && (prev.ema50 <= prev.bbb20))
                if ((current.ema100 > current.ema50) && (current.ema200 > current.ema50))
                    if ((current.macd_distance >= last.macd_distance) && (last.macd_distance >= prev.macd_distance))
                        if (current.bbu20 / current.bbl20 >= 1.013)
                            if (current.close < current.ema10) {
                                return true;
                            }
        }
    }

    async canSell({ symbolId, timeframe }, last, prev, signal) {
        let current = signal.candle;
        const [currentX, lastX, prevX] = (await loadPoints({ symbolId, timeframe: this.options.timeframeX })).reverse();

        if (current && last)
            if (((current.ema50 < current.bb20) && (last.ema50 >= last.bbb20))) {
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
        const M1 = 1e3 * 60;
        const price = this.prices[symbolId];
        const duration = Date.now() - timestamp;

        if (maxChange > 0) {
            if (change == maxChange) {
                return false;
            }
        }
        if (price) {

            if (valuePercent(openPrice, price.bid) >= .45) {
                return true
            }
        }
        if (change < this.options.stopLoss) {
            return true;
        }
        if (duration > 3 * H1) {
            return true
        }

        return valuePercent(openPrice, this.options.takeProfit);
    }
}
