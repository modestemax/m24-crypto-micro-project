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

    async   initAsset(asset) {
        let arrayToObject = ([timestamp, open, high, low, close, volume]) => ({ timestamp, open, high, close, low, volume });
        let ohlcv = await exchange.fetchOHLCV(asset.symbol, '1d', void 0, 1) // one minute
        let candle = arrayToObject(_.last(ohlcv));
        const m24 = {
            ...candle,
            symbolId: asset.info.symbol,
            symbol: asset.symbol,
            change: computeChange(candle.open, candle.close),
            maxChange: computeChange(candle.open, candle.high),
            time: candle.timestamp
        };
        _.extend(asset, { m24 })
    }
    assetChanged(asset, newAsset) {
        if (/\/BTC/.test(asset.symbol)) {
            const { symbol, m24 } = asset;
            if (m24) {
                m24.prevChange = m24.change;
                m24.change = computeChange(m24.open, newAsset.close);
                m24.maxChange = _.max([m24.change, m24.maxChange]);
                m24.instantDelta = Math.abs(m24.change - m24.prevChange);
                m24.maxInstantDelta = _.max([m24.instantDelta, m24.maxInstantDelta]);

                m24.delta = m24.delta ? (m24.delta + m24.instantDelta) / 2 : m24.instantDelta;

                if (m24.change > 5 && m24.change == m24.maxChange) {
                    m24.openPrice = newAsset.bid;
                    this.buy(asset);
                }
            }
        }
    }
};