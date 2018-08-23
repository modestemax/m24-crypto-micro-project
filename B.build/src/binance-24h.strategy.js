const debug = require('debug')('B:strategy:emah1h4');
const _ = require('lodash');
const Template = require('./strategyBase');
const { candleUtils, exchange, redis, publish } = require("common");
const { computeChange, valuePercent } = candleUtils;
const { redisGet, redisSet, } = redis;

module.exports = class extends Template {
    constructor(options) {
        super(options);
        this.track24H()

    }
    async track24H() {
        this.startTime = Date.now();
        let assets = await redisGet('assets') || await exchange.fetchTickers();
        _.forEach(assets, (asset, baseId) => {
            this.initAsset(asset);
        });

        let count = 0;
        setInterval(async () => {
            let prices = await exchange.fetchTickers();
            _.forEach(assets, (asset, baseId) => {
                this.assetChanged(asset, prices[baseId])
            })
            ++count > 6 && (redisSet({ key: 'assets', data: assets, expire: 60 * 2 }), count = 0)//2 min
        }, 10e3)

        // setInterval(async () => this.logTop5(assets), 5e3)
        setInterval(async () => this.logTop5(assets), 10 * 60e3)
    }
    logTop5(assets) {
        let top5 = _(assets).filter(asset =>
            /\/BTC/.test(asset.symbol) && asset.percentage > 2 && asset.m24.change > 0)
            .orderBy(asset => asset.m24.change).reverse().slice(0, 5)
            .map(asset => ({ symbolId: asset.info.symbol, change: asset.m24.change.toFixed(2) })).value();
        publish('m24:algo:tracking', { strategyName: this.name, top5 });
        top5.length && top5.map(t => `${t.symbolId} ${t.change}`).map(str => console.log(str))
    }
    initAsset(asset, newAsset) {
        const now = Date.now();
        const m24 = { symbolId: asset.info.symbol, time: now, upCount: 0, downCount: 0 };
        _.extend(asset, { m24 }, newAsset)
    }
    assetChanged(asset, newAsset) {
        if (/\/BTC/.test(asset.symbol)) {
            const { symbol, m24 } = asset;
            console.log(asset.symbol, m24.change);
            const now = Date.now();

            m24.bid = newAsset.bid;
            m24.duration = now - m24.time;
            m24.prevChange = m24.change;
            m24.change = computeChange(asset.close, newAsset.close);
            m24.maxChange = _.max([m24.change, m24.maxChange]);

            m24.instantDelta = Math.abs(m24.change - m24.prevChange);
            m24.maxInstantDelta = _.max([m24.instantDelta, m24.maxInstantDelta]);

            m24.delta = m24.delta ? (m24.delta + m24.instantDelta) / 2 : m24.instantDelta;

            m24.upCount += m24.delta > 0;
            m24.downCount += m24.delta < 0;
            m24.growingUpSmoothly = m24.upCount > 2 && m24.upCount > m24.downCount;
            m24.bidVolume = newAsset.info.bidQty * newAsset.info.bidPrice;
            m24.volumeRatio = m24.bidVolume / newAsset.info.quoteVolume * 100

            const { change, maxInstantDelta, delta, growingUpSmoothly, volumeRatio, bidVolume, duration } = m24;
           
            console.log('#'+symbol, change);

            const BREAK_CHANGE = 3;
            if (change > BREAK_CHANGE) {//faire aumoins 3% 
                if (newAsset.percentage > 2) //ne pas toucher a ceux qui sont descendant
                    // if (asset.percentage < 15) //ne pas toucher a ceux qui sont dejà assez monté
                    if (delta < .5) //if (delta < .5) //se rassurer des petits pas entre les variations
                        if (maxInstantDelta < 1)//pas de hause/chute (pique) brusque
                            if (growingUpSmoothly)//monté progressive
                                if (newAsset.info.quoteVolume > 40 && bidVolume < 1)//assez bon volume 24H
                                    if (volumeRatio < 10) {//quantité de bid relativement petite
                                        console.log(new Date(now), symbol, m24.bid, change.toFixed(2), '%', 'Duration', duration / (1e3 * 60), 'min');
                                        this.buy(asset);
                                        this.initAsset(asset, newAsset);
                                    }
            }
            if (change < -1 || newAsset.percentage < 2 || delta > .5 || maxInstantDelta > 1) {
                this.initAsset(asset, newAsset);
            }
        }
    }
    buy(asset) {
        let { symbolId, bid } = asset.m24;
        Object.assign(this, { symbolId, bid });
        this.notifyBuy();
    }
    async canBuy() {

    }
};

