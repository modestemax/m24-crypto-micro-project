const debug = require('debug')('B:strategy:bbema150-15M');

const M24Base = require('./m24Base');
const _ = require('lodash');
const { publish, subscribe, redisSet, redisGet } = require('common/redis');
const { candleUtils, saveDatum, exchange, humanizeDuration } = require("common");
const { computeChange, valuePercent } = candleUtils;

module.exports = class extends M24Base {

    constructor(...args) {
        super(...args)

    }
    async   rememberTrackings() {
        if (this._stopTrackings) {
            return this._stopTrackings;
        } else {
            this._stopTrackings = await redisGet('m24trackings') || {}
        }
    }
    async canBuy({ symbolId, timeframe }, last, prev, signal) {
        let current = signal.candle;
        await this.rememberTrackings();
        if (current && this._stopTrackings[symbolId] !== current.id) {
            const change = computeChange(current.open, current.close);
            const changeMax = computeChange(current.open, current.high);

            if (change > this.options.enterThreshold && changeMax - change < 1) {
                let ticker = await this.getTicker({ symbolId });
                if (ticker && ticker.bid) {
                    console.log(`${symbolId} BID AT ${ticker.bid} ${ticker.now} `);
                    this._stopTrackings[symbolId] = current.id;
                    redisSet({ key: 'm24trackings', data: this._stopTrackings });
                    return ticker.bid;
                }
            }
        }
    }

    async canSell({ symbolId, timeframe }, last, prev, signal) {



    }

    getSellPriceIfSellable(rawAsset) {
        const { change, maxChange, openPrice, closePrice, symbolId, timestamp } = rawAsset;
        const H1 = 1e3 * 60 * 60;
        const M1 = 1e3 * 60;
        const price = this.prices[symbolId];
        const duration = Date.now() - timestamp;

        if (maxChange - change > this.options.lossThreshold) {
            return true
        }
        if (change < this.options.stopLoss) {
            return true;
        }
    }
};

