const debug = require('debug')('B:strategy:emah1h4');
const _ = require('lodash');
const Template = require('./strategyBase');
const { candleUtils, exchange } = require("common");
const { computeChange, valuePercent } = candleUtils;

module.exports = class extends Template {
    constructor(options) {
        super(options);
        this.track24H()

    }
    async track24H() {
        this.startTime = Date.now();
        let assets = await exchange.fetchTickers();
        _.forEach(assets, (asset, baseId) => {
            this.initAsset(asset);
        })
        setInterval(async () => {
            let prices = await exchange.fetchTickers();
            _.forEach(assets, (asset, baseId) => {
                this.assetChanged(asset, prices[baseId])
            })
        }, 5e3)
    }
    initAsset(asset, newAsset) {
        const now = Date.now();
        const m24 = { symbolId: asset.info.symbolId, time: now, upCount: 0, downCount: 0 };
        _.extend(asset, { m24 }, newAsset)
    }
    assetChanged(asset, newAsset) {
        if (/\/BTC/.test(asset.symbol)) {
            const { symbol, } = asset;

            const now = Date.now();
            const m24 = asset.m24;
            m24.bid = newAsset.close;
            m24.duration = now - m24.time;
            m24.prevChange = m24.change;
            m24.change = computeChange(asset.close, newAsset.close);
            m24.delta = (m24.change - m24.prevChange);
            m24.maxChange = _.max([m24.change, m24.maxChange]);
            m24.maxReverse = _.max([m24.prevChange - m24.change, m24.maxReverse]);
            m24.upCount += m24.delta > 0;
            m24.downCount += m24.delta < 0;
            m24.growingUpSmoothly = m24.upCount > m24.downCount;
            asset.currAsset = newAsset;

            const { change, maxReverse, delta, growingUpSmoothly, duration } = m24;

            if (change > 3 && Math.abs(delta) < .5 && maxReverse < 1 && growingUpSmoothly) {
                console.log(new Date(now), symbol, change.toFixed(2), '%', 'Duration', duration / (1e3 * 60), 'min');
                this.bid(asset);
            } else if (change < -1) {
                this.initAsset(asset, newAsset);
            }
        }
    }
    bid(asset) {
        let { symbolId, bid } = asset.m24;
        Object.assign(this, { symbolId, bid });
        this.notifyBuy();
    }
    async canBuy() {

    }
};

