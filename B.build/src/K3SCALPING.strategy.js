const debug = require('debug')('B:strategy:bbema150-15M');
const { candleUtils } = require('common');
const { getNewCandleId, loadPoints, valuePercent, computeChange } = candleUtils;

const Template = require('./strategyBase');


module.exports = class extends Template {

    async canBuy({ symbolId, timeframe }, last, prev, signal) {
        const [currentX, lastX, prevX] = (await loadPoints({ symbolId, timeframe: this.options.timeframeX }));
        let current = signal.candle;
        if (last && prev && current && currentX && lastX && prevX) {

            if (current.ema10 <= current.bbb20)
                if ((current.close < current.ema10) && (current.bbu20 / current.close >= 1.005))
                    if (((current.ema20 > current.bbb20) && (current.ema20 <= current.ema30)) || ((current.ema20 < current.bbb20) && (current.ema20 > current.ema30)))
                        if ((last.macd_distance > prev.macd_distance) && (current.macd_distance > last.macd_distance))
                            if ((last.ema20 > prev.ema20) && (current.macd > last.macd_signal))
                                if ((current.plus_di > current.minus_di) && (currentX.adx > last.adx))
                                    if ((lastX.plus_di > lastX.minus_di) && (currentX.plus_di > currentX.minus_di) && (currentX.macd_distance > lastX.macd_distance) && (currentX.open < currentX.close)) {
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

        //-----ci dessous a revoir 

        // if (-1 < change && change < 0 && duration < 10 * M1) {
        //     return false;
        // } else if (change < -2.8) {
        //     return true
        // } /*else if (change < 1 && maxChange < 0) {
        //     return true;
        // } */else if (change > .3 && maxChange > change) {
        //     return true;
        // } else if (-2.5 < change && change < -2) {
        //     // return valuePercent(openPrice, -.5)
        //     true
        // } else if (duration > H1 && change >= .3) {
        //     return true;
        // } else if (duration > 2 * H1 && change > .15) {
        //     return true;
        // } else if (duration > 2.5 * H1 || duration > 2 * H1 && change < .15) {
        //     return true
        // } else {
        //     //return valuePercent(openPrice, .7);
        // }
    }
}
