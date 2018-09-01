const debug = require('debug')('B:strategy-base');
const _ = require('lodash');

const { publish } = require('common/redis');
const { tradingView, candleUtils, computeChange } = require('common');
const { findSignal } = candleUtils;

module.exports = class Strategy {

    constructor({ name, ...options }) {
        Object.assign(this, { bid: null, name, options });
        publish('m24:algo:loaded', this)
    }   

    async check(signal) {
        const { exchange, symbolId, timeframe, spreadPercentage } = signal.candle;
        if (+timeframe === this.options.timeframe && spreadPercentage < 1) {
            const last = signal.candle;
            const prev = signal.candle_1;
            let bid = await this.canBuy(signal.candle, last, prev, signal);
            let ask = await this.canSell(signal.candle, last, prev, signal);

            Object.assign(this, { symbolId, bid, ask, timeframe, exchange });
            if (bid) {
                debug(`${this.name} Buy OK`);
                this.notifyBuy();
            } else if (ask) {
                debug(`${this.name} Sell OK`);
                this.notifySell();
            }
        }
    }
    selfSell(asset) {
        let ask = this.getSellPriceIfSellable(asset)
        if (ask) {
            if (typeof ask === 'boolean') {
                delete asset.closePrice;
                publish('crypto:sell_market', asset)
            } else {
                asset.closePrice = ask
                publish('crypto:sell_limit', asset)
            }
        }
    }

    getSellPriceIfSellable(asset) {

    }
    canBuy({ exchange, symbolId, timeframe }, last, prev, signal) {
    }
    canSell({ exchange, symbolId, timeframe }, last, prev, signal) {
    }
    notifyBuy() {
        this.notify('BUY')
    }
    notifySell() {
        this.notify('SELL')
    }
    notify(side) {
        const { name: strategyName, options, ask: closePrice, bid: openPrice, symbolId, timeframe } = this;
        let order = ({ strategyName, openPrice, closePrice, symbolId, timeframe });

        const [price, event] = side === 'BUY' ? [openPrice, 'crypto:buy_limit'] : [closePrice, 'crypto:sell_limit'];

        this.pairFound({ side, symbolId, price });
        if (price && options.doTrade) {
            publish(event, order);
            debug(`[strategy:${strategyName}] ${side} ${symbolId} at price: ${price}`)
        }
    }

    pairFound({ side, symbolId, price }) {
        publish(`m24:algo:pair_found`, { side, strategyName: this.name, symbolId, price });
    }
    async getTicker({ exchange: exchangeId, symbolId }) {
        let tick = await tradingView({ filter: symbolId, exchangeId });
        return tick[symbolId]
    }

    async findSignal({ exchange, symbolId, timeframe, position }) {
        return findSignal({ exchange, symbolId, timeframe, position })
    }

    change({ open, close }) {
        return computeChange(open, close);
    }
};

