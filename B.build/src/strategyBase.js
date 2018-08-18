const debug = require('debug')('B:strategy-base');
const _ = require('lodash');

const { tradingView, redisKeysExists, redisGet, redisSet, publish, candleUtils, computeChange } = require('common');
const { findSignal } = candleUtils;

module.exports = class Strategy {

    constructor({ name, ...options }) {
        Object.assign(this, { bid: null, name, options });
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
        const { name: strategy, options: strategyOptions, ask, bid, exchange, symbolId, timeframe } = this;
        let order = ({ strategy, strategyOptions, bid, ask, exchange, symbolId, timeframe });

        const [price, event] = side === 'BUY' ? [bid, 'crypto-bid'] : [ask, 'crypto-ask'];

        publish(`m24:algo`,
            { side, strategy, symbolId, price, chat_id: strategyOptions.ownerTelegramChatId },
            { rateLimit: 60 * 5 }
        );
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

