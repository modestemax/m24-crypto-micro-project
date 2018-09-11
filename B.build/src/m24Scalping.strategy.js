const debug = require('debug')('B:strategy:emah1h4');
const _ = require('lodash');

const M24Base = require('./m24Base');

const { subscribe, publish, redisGet, redisSet, } = require("common/redis");
const { candleUtils, exchange, humanizeDuration } = require("common");
const { computeChange, valuePercent } = candleUtils;


module.exports = class extends M24Base {

    constructor(...args) {
        super(...args)
        this.found = {}
    }

    test(m24, BREAK_CHANGE = .8, DURATION = 0) { //1hour
        const { symbolId, change, maxChange, bid, symbol, maxInstantDelta, delta, growingUpSmoothly,
            volumeRatio, askVolumeBTC, bidVolumeBTC, spreadPercent, duration, previousClose,
            open, close, high, adx, maxDrop, percentage, prevPercentage, highPercentage,
            lastQuoteVolume } = m24;

        const last = this.last[symbolId]
        const prev = this.prev[symbolId]
        const candle = this.candle[symbolId];
        if (/\/BTC/.test(symbol))
            if (change > BREAK_CHANGE && isFinite(change)) { //faire aumoins 3% 
                if (maxChange - change < .25)
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

                                                    if (last && prev && candle)
                                                        // if (last.macd > last.macdSignal)
                                                        if (candle.macdDistance > last.macdDistance)
                                                            if (last.macdDistance > prev.macdDistance)
                                                                // if (last.plusDi > last.minusDi)
                                                                if (candle.diDistance > last.diDistance)
                                                                    if (last.diDistance > prev.diDistance)
                                                                        // if (last.adx > 25)
                                                                        if (candle.adx > last.adx)
                                                                            if (last.adx > prev.adx)
                                                                                /* if (this.sorted(adx)) */
                                                                                return true;
            }

    }
    getOpenPrice(m24) {
        return m24.ask
    }
    tryReset(asset, newAsset) {
        const { bid, delta, upCount, symbolId, downCount, change, maxChange, duration, highPercentage, percentage } = asset.m24;

        if (change < 0 || downCount > 2 || maxChange - change > 1 || duration > 1e3 * 60 * 30) {
            this.initAsset(asset, newAsset);
        }
        const found = this.found[symbolId];
        if (found && found.initAsset) {
            found.initAsset = false;
            this.initAsset(asset, newAsset);
        }
    }
    pairFound({ side, symbolId, price, test }) {
        const found = this.found[symbolId];
        if (found && found.price0 !== price) {
            found.price0 = found.price0 || price;
            let change = computeChange(found.price0, price);
            if (change >= 0 && found.changes.length >= 2 && _.min(found.changes) > .3) {
                publish(`m24:algo:pair_found`, { side, strategyName: this.name, symbolId, price: `${price.toFixed(8)} [${change.toFixed(2)}%] `, test });
                console.log(`${this.name} ${symbolId} ${price.toFixed(8)} [${change.toFixed(2)}%] `)
                return true;
            }
        }
    }
    async tick(price) {
        const symbolId = price && price.info && price.info.symbol;
        const found = this.found[symbolId] = this.found[symbolId]
            || (await this.getFound(symbolId));

        if (found.price0) {
            let change = computeChange(found.price0, price.close);
            if (change > 0) {
                found.change = _.max([found.change, change]);
            }
            if ((change < 0 || change >= .3)) {
                let changed;
                if (found.change) {
                    found.changes = [found.change, ...found.changes.slice(0, 4)];
                    changed = true;
                }
                found.change = null;
                found.price0 = null;
                changed && this.saveFound(found);
                found.initAsset = true;
            }
        }
    }
    async getFound(symbolId) {
        return (await redisGet('found:' + symbolId)) || { changes: [], symbolId };
    }
    saveFound(found) {
        redisSet({ key: 'found:' + found.symbolId, data: found });
    }
    getSellPriceIfSellable(asset) {
        const { change, maxChange, openPrice } = asset;
        if (change < -1) {
            return valuePercent(openPrice, -.5)
        } else {
            return valuePercent(openPrice, .25);
        }

    }
};
