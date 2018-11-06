const debug = require('debug')('B:strategy:bbema150-15M');
const { candleUtils } = require('common');
const { getNewCandleId, loadPoints, valuePercent, computeChange } = candleUtils;

const Template = require('./strategyBase');


module.exports = class extends Template {

    async canBuy({ symbolId, timeframe }, last, prev, signal) {
        // const [currentX, lastX, prevX] = (await loadPoints({ symbolId, timeframe: this.options.timeframeX }));
        // const [candle, candle_1, candle_2, candle_3, candle_4] = (await loadPoints({ symbolId, timeframe: this.options.timeframe }));
        let current = signal.candle;
        if (last && prev && current) {

            if ((prev.ema50 >= prev.ema10) && (last.ema50 >= last.ema10) && (current.ema50 < current.ema10))
                if ((current.ema20 > current.ema30) && (current.ema10 > current.ema20) && (current.ema20 > current.bbb20))
                    if ((current.macd > 0) && (current.macd >= current.macd_signal))
                        if ((current.bbu20 > last.bbu20) && (current.bbl20 <= last.bbl20))
                            if ((current.close < current.bbu20)) {
                                return true;
                            }
        }
    }

    async canSell({ symbolId, timeframe }, last, prev, signal) {
        // let current = signal.candle;
        // const [currentX, lastX, prevX] = (await loadPoints({ symbolId, timeframe: this.options.timeframeX }));

        // if (current && last)
        //     if ((current.ema20 < current.bbb20) && (last.ema20 >= last.bbb20))
        //         if ((current.macd_distance < last.macd_distance)) {
        //             let ticker = await this.getTicker({ symbolId });
        //             if (ticker && ticker.bid) {
        //                 debug(`${symbolId} ASK AT ${ticker.bid}`);
        //                 return ticker.bid;
        //             }
        //         }


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
