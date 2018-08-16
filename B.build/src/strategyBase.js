const debug = require('debug')('strategy');
const _ = require('lodash');

const { tradingView, redisGet, publish, candleUtils } = require('common');
const { keyExistsAtPosition } = candleUtils;

module.exports = class Strategy {

    constructor({ name, options }) {
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
        switch (side) {
            case 'BUY':
                if (bid) {
                    publish('crypto-bid', order);
                    debug(`[strategy:${strategy}] ${side} ${symbolId} at price: ${bid}`)
                }
                break;
            case 'SELL':
                if (ask) {
                    publish('crypto-ask', order);
                    debug(`[strategy:${strategy}] ${side} ${symbolId} at price: ${ask}`)
                }
                break;
        }

    }

    async getTicker({ exchange: exchangeId, symbolId }) {
        let tick = await tradingView({ filter: symbolId, exchangeId });
        return tick[symbolId]
    }

    async findSignal({ exchange, symbolId, timeframe, position }) {
        let key = await keyExistsAtPosition({ exchange, symbolId, timeframe, position });
        if (key) {
            let signal = await redisGet(key);
            return JSON.parse(signal);
        }
    }

    change({ open, close }) {
        return (close - open) / open * 100;
    }
};

