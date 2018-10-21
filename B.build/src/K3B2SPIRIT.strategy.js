const debug = require('debug')('B:strategy:bbema150-15M');
const { candleUtils } = require('common');
const { getNewCandleId, loadPoints, valuePercent, computeChange } = candleUtils;

const Template = require('./strategyBase');


module.exports = class extends Template {

    async canBuy({ symbolId, timeframe }, last, prev, signal) {
        const [currentX, lastX, prevX] = (await loadPoints({ symbolId, timeframe: this.options.timeframeX }));
        const [candle, candle_1, candle_2, candle_3, candle_4] = (await loadPoints({ symbolId, timeframe: this.options.timeframe }));
        let current = signal.candle;
        if (last && prev && current && currentX && lastX && candle_3) {

            if ((last.ema20 >= last.bbb20) && (last.ema10 >= last.ema20))
                if ((current.ema100 >= current.bbb20) && (current.ema200 >= current.ema20) && (current.ema50 >= current.bbb20))
                    if ((current.ema20 > current.ema30) && (last.ema20 >= last.ema30))
                        if ((last.ema100 <= last.bbu20) && (current.ema100 <= current.bbu20))
                            if ((current.ema200 > current.ema10) && (last.ema200 > last.ema10))
                                if ((current.bbu20 / current.bbl20 >= 1.01) && (current.bbu20 / current.bbl20 <= 1.05))
                                    if (/*(last.bbl20 < prev.bbl20) &&*/ (current.bbl20 < candle_3.bbl20))
                                        if ((last.bbu20 > prev.bbu20) && (prev.bbu20 > candle_3.bbu20))
                                            if ((last.plus_di > last.minus_di) && (current.plus_di > 20))
                                                //if((last.plus_di > 20) && (last.minus_di < 20) && (current.plus_di > 20))
                                                if ((current.ema10 > last.ema10) && (current.ema10 >= current.ema20))
                                                    if ((current.macd_distance >= last.macd_distance) && (last.macd_distance >= prev.macd_distance) && (prev.macd_distance >= candle_3.macd_distance))
                                                        if ((current.close <= current.bbu20) /*&& (currentX.close > currentX.open)*/) {
                                                            return true;
                                                        }
        }
    }

    async canSell({ symbolId, timeframe }, last, prev, signal) {
        let current = signal.candle;
        const [currentX, lastX, prevX] = (await loadPoints({ symbolId, timeframe: this.options.timeframeX }));

        // if (currentX && lastX)
        // if ((current.ema20 <= current.bbb20) && (last.ema20 > last.bbb20)) {
        //     let ticker = await this.getTicker({ symbolId });
        //     if (ticker && ticker.bid) {
        //         debug(`${symbolId} ASK AT ${ticker.bid}`);
        //         return ticker.bid;
        //     }
        // }


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
