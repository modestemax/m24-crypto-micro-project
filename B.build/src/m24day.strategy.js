const debug = require('debug')('B:strategy:bbema150-15M');

const M24Base = require('./m24Base');
const _ = require('lodash');
const { publish, subscribe, redisSet, redisGet } = require('common/redis');
const { candleUtils, saveDatum, exchange, humanizeDuration } = require("common");
const { computeChange, valuePercent } = candleUtils;

module.exports = class extends M24Base {

    constructor(...args) {
        super(...args)
        // this.cryptos = {}
        subscribe('m24:algo:top', ({ chat_id, n }) => {
            let top = this.above(n);
            publish('m24:algo:top_result', { top, chat_id });
        })
        subscribe('m24:algo:reset', ({ chat_id, asset }) => {
            if (asset && this.cryptos && this.cryptos[asset + 'BTC']) {
                delete this.cryptos[asset.toUpperCase() + 'BTC'];
            } else if (asset = 'ALL') {
                this.cryptos = {}
            }
        })

        redisGet('m24day:cryptos').then(cryptos => {
            this.cryptos = cryptos || {}
        });
        this.saveCryptos = _.throttle(() => redisSet({ key: 'm24day:cryptos', data: this.cryptos }), 1e3 * 60 * 5);

    }
    async  tick(price) {
        if (this.cryptos) {
            const symbolId = price.info.symbol;

            const crypto = this.cryptos[symbolId] = this.cryptos[symbolId] || {};
            crypto.symbolId = symbolId;
            crypto.open = crypto.open || price.close;
            crypto.close = price.close;
            crypto.high = _.max([crypto.high, crypto.close])
            crypto.low = _.min([crypto.low, crypto.close])
            crypto.change = computeChange(crypto.open, crypto.close)
            crypto.changeToHigh = computeChange(crypto.open, crypto.high)
            crypto.loss = crypto.change - crypto.changeToHigh;

            this.saveCryptos();
        }
    }
    above(n = 5) {
        const top = [];
        for (let symbolId in this.cryptos) {
            let crypto = this.cryptos[symbolId];
            if (crypto.change >= n || crypto.high >= n) {
                top.push(crypto);
            }
        }
        return _.orderBy(top, 'change', 'desc');
    }

};

