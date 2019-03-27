const debug = require('debug')('B:strategy:bbema150-15M');

const M24Base = require('./m24Base');
const _ = require('lodash');
const { publish, subscribe, redisSet, redisGet } = require('common/redis');
const { candleUtils, saveDatum, exchange, humanizeDuration } = require('common');
const { computeChange, valuePercent } = candleUtils;

const redisSetThrottle = _.throttle(redisSet, 1e3 * 2);

module.exports = class extends M24Base {
    constructor(...args) {
        super(...args);
        this.outOfTop = this.outOfTop || {};
    }

    async setTracking({ id, open, symbolId, now, position_good_spread, change_from_open, last_sell_change, ...args }) {
        this._stopTrackings = this._stopTrackings || {};
        this._stopTrackings[id] = this._stopTrackings[id] || {};
        this._stopTrackings[id][symbolId] = { symbolId, open, now, position_good_spread, change_from_open, last_sell_change };
        redisSetThrottle({
            key: this.getTrackKey(id),
            data: await this.getTrackings(id),
            expire: 60 * 60 * 24 * 7
        });
    }

    hasTracking({ id, open, symbolId, ...args }) {
        return _.get(this._stopTrackings[id], symbolId);
    }

    getTracking({ id, symbolId }) {
        return _.get(this._stopTrackings, `${id}[${symbolId}]`);
    }

    async getTrackings(id) {
        if (this._stopTrackings) {
            return this._stopTrackings;
        } else {
            this._stopTrackings = (await redisGet(this.getTrackKey(id))) || { [id]: {} };
        }
    }

    getTrackKey(id) {
        return `m24trackings_${this.name}_${id}`;
    }

    async canBuy({ symbolId, timeframe }, last, prev, signal) {
        let current = signal.candle;
        // const currentWeek = this.signals[10080][symbolId].candle;
        await this.getTrackings(current.id);
        // if (currentWeek)
        //     if (computeChange(currentWeek.ema20, currentWeek.ema10) > 1)
        if (current && last)
        //ema10>>ema20 sur le point precedent
            if (computeChange(last.ema20, last.ema10) > 1)
            //ema10>>ema20 sur le point courant
                if (computeChange(current.ema20, current.ema10) > 1)
                //le status dois etre "buy"
                    if (+current.rating >= 0)
                    //ne considerer que les top
                        if (current.position_good_spread <= this.options.min_position)
                        //doit avoir fait un certain min
                            if (current.change_from_open > this.options.change_from_open_min)
                            //eviter ceux sui ont chuter avant
                                if (current.change_to_high - current.change_from_open <= current.spread_percentage)
                                //la nouvelle bougie doit depasser le milieu de la bougie precedente si elle est rouge
                                //ou le milieu du filament supperieur si bougie verte
                                // if (current.close > (last.close + last.high) / 2)
                                    if (current.close > last.close)
                                    //ne trade que pendant les 3/4 du temps, ie 0h-18h
                                    // if ((new Date(current.now) - new Date(current.time)) / (1e3 * 60) < this.options.timeframe * 4 / 4)
                                    {
                                        // if (this.outOfTop[current.symbolId])
                                        if (!this.hasTracking({ id: current.id, symbolId }))
                                            // return true;
                                            return false;
                                    }
    }

    async canSell({ symbolId, timeframe }, last, prev, signal) {
    }

    getSellPriceIfSellable(rawAsset) {
        const { change, maxChange, symbolId } = rawAsset;
        const SELL_AT_MARKET_PRICE = true;
        const current = _.get(this.signal, `[${symbolId}].candle`);


        const ONE_MINUTE = 1e3 * 60;

        if (current) {
            if (!this.hasTracking({ id: current.id, symbolId })) {
                this.setTracking({ id: current.id, symbolId })
            }

            if (current.position_good_spread > this.options.min_position) {
                //------------SORTI DU LE TOP------------------

                if (this.outOfTop[symbolId] && (Date.now - this.outOfTop[symbolId].since) > ONE_MINUTE * 5) {
                    // return SELL_AT_MARKET_PRICE;
                    return Math.max(1, change)
                } else if (!this.outOfTop[symbolId]) {
                    this.outOfTop[symbolId] = { since: Date.now }
                }
            } else {
                //------------ENCORE DANS LE TOP------------------
                if (maxChange - change >= 2) {
                    // return SELL_AT_MARKET_PRICE
                } else {
                    // delete this.outOfTop[symbolId];
                }
            }
        }

        if (maxChange <= 0 && change < -1) {
            return SELL_AT_MARKET_PRICE
        }
    }
};
