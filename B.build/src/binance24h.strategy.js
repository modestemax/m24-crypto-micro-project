const debug = require('debug')('B:strategy:emah1h4');
const _ = require('lodash');
const M24Base = require('./m24Base');

const { subscribe, publish, redisGet, redisSet, } = require("common/redis");
const { candleUtils, saveDatum, exchange, humanizeDuration } = require("common");
const { computeChange, valuePercent } = candleUtils;


module.exports = class extends M24Base {

    constructor(...args) {
        super(...args);
        this.symbols = {}
    }

    test(m24, BREAK_CHANGE = 3, DURATION = 1e3 * 60 * 60 * 1) {//1hour
        const {symbolId, change, maxChange, bid, symbol, maxInstantDelta, delta, growingUpSmoothly, volumeRatio,
            askVolumeBTC, bidVolumeBTC, spreadPercent, duration,
            previousClose, open, close, high, maxDrop,
            percentage, prevPercentage, highPercentage, lastQuoteVolume } = m24;
        const last = this.last[symbolId]
        const prev = this.prev[symbolId];

        if (/\/BTC/.test(symbol))
            if (change > BREAK_CHANGE && isFinite(change)) {//faire aumoins 3% 
                if (prevPercentage < percentage) //growing...
                    if (previousClose < close)
                        // if (maxDrop < 1)
                        if (open < close && close < high)
                            // if (valuePercent(close, high) > 1)
                            if (maxChange - change < 2)

                                if (percentage > 2) //ne pas toucher a ceux qui sont dejà assez monté
                                    if (spreadPercent < 1)//bid-ask percentage
                                        if (delta < .5) //if (delta < .5) //se rassurer des petits pas entre les variations
                                            if (maxInstantDelta < 1)//pas de hause/chute (pique) brusque
                                                if (growingUpSmoothly)//monté progressive
                                                    if (lastQuoteVolume > 8)//top 100
                                                        if (askVolumeBTC < 1 && bidVolumeBTC < 1)//assez bon volume 24H
                                                            // if (bidVolumeBTC < 1)//assez bon volume 24H

                                                            // BREAK_CHANGE > 0 && this.analyseProgress(m24);
                                                            // if (duration > DURATION)

                                                            if (volumeRatio < 10)
                                                                if (last && prev)
                                                                    if (last.macd > last.macdSignal)
                                                                    if (last.macdOscillator > prev.macdOscillator) {//quantité de bid relativement petite
                                                                        return true;
                                                                    }

            }
    }

    getOpenPrice(m24) {
        const { bid, delta, open } = m24;
        // let myBid = bid - (delta * bid / 100) / 2
        // if (myBid < open) {
        //     return bid
        // } else {
        //     return myBid;
        // }
        return bid;
    }

    getSellPriceIfSellable(rawAsset) {
        const { change, maxChange, openPrice, symbolId } = rawAsset;
        // let lossPercentage = maxChange - change;
        let asset = _.find(this.assets, a => a.m24.symbolId === symbolId);
        asset && this.initAsset(asset);
        if (change < -3) {
            return valuePercent(openPrice, -2.5)
        } else {
            return valuePercent(openPrice, 1.2);
        }
    }
    getSellPriceByRangeIfSellable(rawAsset) {
        const { change, maxChange, openPrice, symbolId } = rawAsset;

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

    }
    tryReset(asset, newAsset) {
      
    }

    analyseProgress({ symbol, close }) {
        //il est question ici de voir ceux qui en general franchisse la barre des 3% et continue 
        //et ceux qui ne continue pas
        this.symbols[symbol] = { close }
    }
    tick(price) {
        // debugger
        const symbol = price.symbol;
        let pair = this.symbols[symbol];
        if (pair) {
            pair.change = computeChange(pair.close, price.close);
            if (pair.change > 1.5) {
                saveDatum({ hKey: 'gainers', id: symbol, datum: symbol });
                this.symbols[symbol];
            } else if (pair.change < -3) {
                saveDatum({ hKey: 'loosers', id: symbol, datum: symbol });
                this.symbols[symbol];
            }
        }
    }
};
