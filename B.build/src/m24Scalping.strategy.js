const debug = require('debug')('B:strategy:emah1h4');
const _ = require('lodash');
const M24Base = require('./m24Base');

const { subscribe, publish, redisGet, redisSet, } = require("common/redis");
const { candleUtils, exchange, humanizeDuration } = require("common");
const { computeChange, valuePercent } = candleUtils;


module.exports = class extends M24Base {

    test(m24, BREAK_CHANGE = 1) {
        const { change, bid, symbol, maxInstantDelta, delta, growingUpSmoothly, volumeRatio,
            askVolumeBTC, bidVolumeBTC, spreadPercent, duration,
            maxChange, prevPercentage, highPercentage, lastQuoteVolume } = m24;

        if (/\/BTC/.test(symbol))
            if (change > BREAK_CHANGE && isFinite(change)) { //faire aumoins 3% 
                // if (prevPercentage < percentage) //growing...
                // if (previousClose < close)
                // if (maxDrop < 1)
                // if (open < close && close < high)
                // if (valuePercent(close, high) > 1)
                if (maxChange - change < .25)

                    // if (percentage > 2) //ne pas toucher a ceux qui sont dejà assez monté
                    if (spreadPercent < 1) //bid-ask percentage
                        if (delta < .5) //if (delta < .5) //se rassurer des petits pas entre les variations
                            if (maxInstantDelta < 1) //pas de hause/chute (pique) brusque
                                if (growingUpSmoothly) //monté progressive
                                    if (lastQuoteVolume > 8) //top 100
                                        if (askVolumeBTC < 1 && bidVolumeBTC < 1) //assez bon volume 24H
                                            // if (bidVolumeBTC < 1)//assez bon volume 24H

                                            // BREAK_CHANGE > 0 && this.analyseProgress(m24);
                                            if (duration > DURATION)

                                                if (volumeRatio < 10)

                                                    if (last && prev)
                                                        if (last.macd > last.macdSignal)
                                                            if (last.macdOscillator > prev.macdOscillator)
                                                                if (last.plusDi > last.minusDi)
                                                                    if (last.DiOscillator > prev.DiOscillator)
                                                                        // if (last.adx > 25)
                                                                        if (last.adx > prev.adx)
                                                                            /* if (this.sorted(adx)) */
                                                                            return true;
            }

    }

    tryReset(asset, newAsset) {
        const { bid, delta, upCount, downCount, change, duration, highPercentage, percentage } = asset.m24;

        if (change < 0 || downCount > 2 || duration > 1e3 * 60 * 30) {
            this.initAsset(asset, newAsset);
        }
    }

    getSellPriceIfSellable(asset) {
        const { change, maxChange, openPrice } = asset;

        return valuePercent(openPrice, .3);

    }
};
