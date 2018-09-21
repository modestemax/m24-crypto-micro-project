const debug = require('debug')('B:strategy:bbema150-15M');
const { candleUtils } = require('common');
const { getNewCandleId, loadPoints, valuePercent, computeChange } = candleUtils;

const Template = require('./strategyBase');


module.exports = class extends Template {

    getSellPriceIfSellable(rawAsset) {
        const { change, maxChange, openPrice, closePrice, symbolId, timestamp } = rawAsset;
        const H1 = 1e3 * 60 * 60;
        const M1 = 1e3 * 60;
        const price = this.prices[symbolId];
        const duration = Date.now() - timestamp;

        if (price) {
            if (valuePercent(openPrice, price.bid) >= .5) {
                return true
            }

            //-----ci dessous a revoir 


            if (change < 0 && duration < 10 * M1) {
                return false;
            } else if (change < -2.8) {
                return true
            } else if (change < 1 && maxChange < 0) {
                return true;
            } else if (change > .3 && maxChange > change) {
                return closePrice;
            } else if (-2.5 < change && change < -2) {
                return valuePercent(openPrice, -.5)
            } else if (duration > H1 && change >= .3) {
                return closePrice;
            } else if (duration > 2 * H1 && change > .15) {
                return closePrice;
            } else if (duration > 2.5 * H1 || duration > 2 * H1 && change < .15) {
                return true
            } else {
                //return valuePercent(openPrice, .7);
            }
        }
    }
}
