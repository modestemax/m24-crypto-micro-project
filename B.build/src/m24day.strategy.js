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
    async canBuy({ symbolId, timeframe }, last, prev, signal) {
        let current = signal.candle;
        if (last && prev && current) {

            if (0) {
                let ticker = await this.getTicker({ symbolId });
                if (ticker && ticker.bid) {
                    console.log(`${symbolId} BID AT ${ticker.bid} ${ticker.now} `);
                    return ticker.bid;
                }
            }
        }
    }

};

