const debug = require('debug')('B:strategy:emah1h4');
const _ = require('lodash');
const binance24h = require('./binance24h.strategy');

const { subscribe, publish, redisGet, redisSet, } = require("common/redis");
const { candleUtils, saveDatum, exchange, humanizeDuration } = require("common");
const { computeChange, valuePercent } = candleUtils;


module.exports = class extends binance24h {


    // test(m24, BREAK_CHANGE = 2, DURATION = 1e3 * 60 * 60 * 1) { //1hour
    test(m24, BREAK_CHANGE = 2, DURATION = 0) { //1hour
        const { symbolId, change, maxChange, bid, symbol, maxInstantDelta, delta, growingUpSmoothly,
            volumeRatio, askVolumeBTC, bidVolumeBTC, spreadPercent, duration, previousClose,
            open, close, high, adx, maxDrop, percentage, prevPercentage, highPercentage,
            lastQuoteVolume } = m24;

        // const last = this.last[symbolId]
        // const prev = this.prev[symbolId];
        const current = this.signal[symbolId] && this.signal[symbolId].candle;

        if (/\/BTC/.test(symbol) && current)
            if (change > BREAK_CHANGE && isFinite(change)) { //faire au moins 3% 
                if (current.position < 11 && current.change_from_open > 2)
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

                                                    if (BREAK_CHANGE > 0) { //quantité de bid relativement petite
                                                        return true;
                                                    } else {
                                                        return true;
                                                    }

            }
    }


};