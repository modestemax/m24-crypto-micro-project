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
        let assets = await exchange.fetchTickers();;
        setInterval(async () => {
            let prices = await exchange.fetchTickers();
            _.forEach(assets, (asset, baseId) => {
                this.assetChanged(asset, prices[baseId])
            })
        }, 5e3)
    }
    assetChanged(asset, newAsset) {
        if (/\/BTC/.test(asset.symbol)) {
            const now = Date.now();
            asset.m24Time = asset.m24Time || this.startTime;
            const duration = now - asset.m24Time;
            asset.m24PrevChange = asset.m24Change;
            asset.m24Change = computeChange(asset.close, newAsset.close);

            const { symbol, m24Change, m24PrevChange, m24Time } = asset;
            if (m24Change > 3 && Math.abs(m24Change - m24PrevChange) < .5) {
                console.log(new Date(now), symbol, m24Change.toFixed(2), '%', 'Duration', duration / (1e3 * 60), 'min');
            } else if (m24Change < -1) {
                asset.m24Change = 0;
                asset.m24Time = now;
            }
        }
    }
    async canBuy() {

    }
};

