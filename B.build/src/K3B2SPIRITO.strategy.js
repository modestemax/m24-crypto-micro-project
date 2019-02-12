const debug = require('debug')('B:strategy:bbema150-15M');
const { candleUtils } = require('common');
const { getNewCandleId, loadPoints, valuePercent, computeChange } = candleUtils;

const Template = require('./strategyBase');


module.exports = class extends Template {

    async canBuy({ symbolId, timeframe }, last, prev, signal) {
        let current = signal.candle;
        if (last && prev && current) {

            if ((current.close < current.bbl20) && (current.ema30 >= current.ema50))
                if (((last.ema200 >= last.bbb20) && (current.ema200 < current.bbb20) && (current.ema200 >= current.ema100)) ||
                    ((last.ema100 >= last.bbb20) && (current.ema100 < current.bbb20) && (current.ema200 < current.ema100))) {
                return true;
            }
        }
    }

    async canSell({ symbolId, timeframe }, last, prev, signal) {
        let current = signal.candle;

        if (last && prev && current) {
            if ((last.ema20 <= last.bbb20) || ((current.macd < last.macd) && (last.macd_distance < prev.macd_distance))) {
                let ticker = await this.getTicker({ symbolId });
                if (ticker && ticker.bid) {
                    debug(`${symbolId} ASK AT ${ticker.bid}`);
                    return ticker.bid;
                }
            }


        }
    }

    getSellPriceIfSellable(rawAsset) {
        // const { change, maxChange, openPrice, closePrice, symbolId, timestamp } = rawAsset;
        // const H1 = 1e3 * 60 * 60;
        // const M1 = 1e3 * 60;
        // const price = this.prices[symbolId];
        // const duration = Date.now() - timestamp;

        // if (maxChange > 0) {
        //     if (change == maxChange) {
        //         return false;
        //     }
        // }
        // if (price) {

        //     if (valuePercent(openPrice, price.bid) >= .45) {
        //         return true
        //     }
        // }
        // if (change < this.options.stopLoss) {
        //     return true;
        // }
        // if (duration > 3 * H1) {
        //     return true
        // }

        // return valuePercent(openPrice, this.options.takeProfit);
    }
}

