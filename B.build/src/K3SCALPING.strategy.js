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
            if (valuePercent(openPrice, price.bid) >= .45) {
                return true
            }
            if (change < this.options.stopLoss) {
                return true;
            }
            if (duration > H1) {
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
}
