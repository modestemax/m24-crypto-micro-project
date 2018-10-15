const debug = require('debug')('B:strategy:bbema150-15M');

const M24Base = require('./m24Base');
const _ = require('lodash');
const { publish, subscribe, redisSet, redisGet } = require('common/redis');
const { candleUtils, saveDatum, exchange, humanizeDuration } = require("common");
const { computeChange, valuePercent } = candleUtils;

module.exports = class extends M24Base {

    constructor(...args) {
        super(...args)
        this.trackKey = 'm24trackings_' + this.name;
    }
    async   rememberTrackings() {
        if (this._stopTrackings) {
            return this._stopTrackings;
        } else {
            this._stopTrackings = await redisGet(this.trackKey) || {}
        }
    }
    async canBuy({ symbolId, timeframe }, last, prev, signal) {
        let current = signal.candle;
        await this.rememberTrackings();
        if (current && last)
            if (current.rating > 0)
                if ((new Date(current.now) - new Date(current.time)) / (1e3 * 60) < this.options.timeframe / 2)
                    if (this._stopTrackings[symbolId] !== current.id) {
                        // const change = computeChange(current.open, current.close);
                        // const changeMax = computeChange(current.open, current.high);

                        //if (change > this.options.enterThreshold && changeMax - change < 1)
                        // if (current.close > last.high)
                        // if (current.close > (_.max([last.open, last.close]) + last.high) / 2)
                        if (current.close > (last.close + last.high) / 2)
                            if (current.change_from_open > this.options.change_from_open_min)
                                if (true) {
                                    let ticker = await this.getTicker({ symbolId });
                                    if (ticker && ticker.bid) {
                                        console.log(`${symbolId} BID AT ${ticker.bid} ${ticker.now} `);
                                        this._stopTrackings[symbolId] = current.id;
                                        redisSet({ key: this.trackKey, data: this._stopTrackings });
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

        if ((maxChange - change) / maxChange > .5) {
            return true
        }
        if (change < this.options.stopLoss) {
            return true;
        }
        return valuePercent(openPrice, this.options.takeProfit);
    }
};

