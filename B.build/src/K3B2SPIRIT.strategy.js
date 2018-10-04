const debug = require('debug')('B:strategy:bbema150-15M');
const { candleUtils } = require('common');
const { getNewCandleId, loadPoints, valuePercent, computeChange } = candleUtils;

const Template = require('./strategyBase');


module.exports = class extends Template {

    async canBuy({ symbolId, timeframe }, last, prev, signal) {
        const [currentX, lastX, prevX] = (await loadPoints({ symbolId, timeframe: this.options.timeframeX })).reverse();
        let current = signal.candle;
        if (last && prev && current && currentX && lastX) {

            if ((current.ema20 >= current.bbb20) && (current.bbu20 / current.bbl20 >= 1.03) && (current.bbu20 / current.bbl20 <= 1.05))
                if ((current.bbl20 < prev.bbl20) && (current.bbu20 > prev.bbu20))
                    if (current.plus_di > current.minus_di)
                        if ((current.ema10 > last.ema10) && (current.ema10 >= current.ema20))
                            if ((current.macd_distance <= last.macd_distance) && (last.macd_distance > prev.macd_distance))
                                if (current.close < current.bbu20) {
                                    let ticker = await this.getTicker({ symbolId });
                                    if (ticker && ticker.bid) {
                                        console.log(`${symbolId} BID AT ${ticker.bid} ${ticker.now} `);
                                        return ticker.bid;
                                    }
                                }
        }
    }

    async canSell({ symbolId, timeframe }, last, prev, signal) {
        let current = signal.candle;
        const [currentX, lastX, prevX] = (await loadPoints({ symbolId, timeframe: this.options.timeframeX })).reverse();

        // if (currentX && lastX)
        if ((current.ema20 <= current.bbb20) && (last.ema20 > last.bbb20)) {
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

        const duration = Date.now() - timestamp;
        if (change < 0 && duration < 10 * M1) {
            return false;
        } else if (change < 1 && maxChange < 0) {
            return true;
        } else if (change > .3 && maxChange > change) {
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
