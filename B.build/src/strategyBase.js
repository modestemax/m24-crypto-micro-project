const debug = require('debug')('B:strategy-base');
const _ = require('lodash');

const { tradingView, redisKeysExists, redisGet, redisSet, publish, candleUtils, computeChange } = require('common');
const { findSignal } = candleUtils;

module.exports = class Strategy {

    constructor({ name, ...options }) {
        Object.assign(this, { bid: null, name, options });
        publish('m24:algo:loaded', this)
    }

    async check(signal) {
        let bid = await this.canBuy(signal);
        let ask = await this.canSell(signal);
        const { exchange, symbolId, timeframe } = signal.candle;
        Object.assign(this, { symbolId, bid, ask, timeframe, exchange });
        if (bid) {
            debug(`${this.name} Buy OK`);
            this.notifyBuy();
        } else if (ask) {
            debug(`${this.name} Sell OK`);
            this.notifySell();
        }
    }


    canBuy(signal) {
    }
    canSell(signal) {
    }
    notifyBuy() {
        this.notify('BUY')
    }
    notifySell() {
        this.notify('SELL')
    }
    notify(side) {
        const { name: strategy, closePrice, openPrice, exchange, symbolId, timeframe } = this;
        let order = ({ strategy, openPrice: openPrice, closePrice, exchange, symbolId, timeframe });

        const [price, event] = side === 'BUY' ?
            [openPrice, 'crypto:buy_limit'] : [closePrice, 'crypto:sell_limit'];

        publish(`m24:algo:pair_found`, { side, strategy, symbolId, price, }, { rateLimit: 60 * 5 });
        if (price) {
            publish(event, order);
            debug(`[strategy:${strategy}] ${side} ${symbolId} at price: ${price}`)
        }
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

