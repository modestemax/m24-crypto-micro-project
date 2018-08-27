const debug = require('debug')('B:strategy:emah1h4');
const _ = require('lodash');
const M24Base = require('./m24Base');

const { subscribe, publish, redisGet, redisSet, } = require("common/redis");
const { candleUtils, exchange, humanizeDuration } = require("common");
const { computeChange, valuePercent } = candleUtils;


module.exports = class extends M24Base {

    test(m24, BREAK_CHANGE = 3, DURATION = 1e3 * 60 * 60 * 1) {//1hour
        const { change, bid, symbol, maxInstantDelta, delta, growingUpSmoothly, volumeRatio,
            askVolumeBTC, bidVolumeBTC, spreadPercent, duration,
            percentage, prevPercentage, highPercentage, lastQuoteVolume } = m24;

        if (/\/BTC/.test(symbol))
            if (change > BREAK_CHANGE && isFinite(change)) {//faire aumoins 3% 
                // if (prevPercentage <= percentage) //growing...
                if (highPercentage - percentage < 2)
                    // if (asset.percentage < 15) //ne pas toucher a ceux qui sont dejà assez monté
                    if (spreadPercent < 1)//bid-ask percentage
                        if (delta < .5) //if (delta < .5) //se rassurer des petits pas entre les variations
                            if (maxInstantDelta < 1)//pas de hause/chute (pique) brusque
                                if (growingUpSmoothly)//monté progressive
                                    if (lastQuoteVolume > 8)//top 100
                                        // if (askVolumeBTC < 1 && bidVolumeBTC < 1)//assez bon volume 24H
                                        if (bidVolumeBTC < 1)//assez bon volume 24H
                                            if (duration > DURATION)
                                                if (volumeRatio < 10) {//quantité de bid relativement petite
                                                    return true;
                                                }
            }
    }

    getSellPriceIfSellable(asset) {
        const { change, maxChange, openPrice } = asset;
        let lossPercentage = maxChange - change;
        if (maxChange < 1) {
            if (change < -3) {
                return true;
            }
        } else if (1 <= maxChange && maxChange < 2) {
            if (lossPercentage > .5) {
                return valuePercent(openPrice, Math.max(change, 1));
            }
        } else if (2 <= maxChange && maxChange < 3) {
            if (lossPercentage > 1) {
                return valuePercent(openPrice, Math.max(change, 1));
            }
        } else if (3 <= maxChange && maxChange < 4) {
            if (lossPercentage > 1.5) {
                return valuePercent(openPrice, Math.max(change, 1.3));
                // return true;
            }
        } else if (4 <= maxChange && maxChange < 5) {
            if (lossPercentage > 2) {
                return valuePercent(openPrice, Math.max(change, 2));
                // return true;
            }
        } else if (5 <= maxChange && maxChange < 8) {
            if (lossPercentage > 3) {
                return valuePercent(openPrice, Math.max(change, 2.5));
                // return true;
            }
        } else if (8 <= maxChange) {
            if (lossPercentage > 3.5) {
                return valuePercent(openPrice, Math.max(change, 5));
                // return true;
            }
        }

        // return valuePercent(openPrice, .3);
        // if (lossPercentage >= 3) {
        //     return true
        // }
    }
    tryReset(asset, newAsset) {
        const { bid, delta, change, duration, highPercentage, percentage } = asset.m24;

        if (change < -1 || highPercentage - percentage > 2 || duration > 1e3 * 60 * 60 * 6) {
            this.initAsset(asset, newAsset);
        }
    }
};