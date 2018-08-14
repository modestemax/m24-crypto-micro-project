const debug = require('debug')('strategy');
const redisLib = require('redis');
const _ = require('lodash');
const Promise = require('bluebird');
const redisClient = redisLib.createClient();
const redis = Promise.promisifyAll(redisClient);
const redisPub = redisClient.duplicate();

const {tradingView} = require('common');

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
        let order = JSON.stringify({ strategy, strategyOptions, bid, ask, exchange, symbolId, timeframe });
        switch (side) {
            case 'BUY':
                if (bid) {
                    redisPub.publish('crypto-bid', order);
                    debug(`[strategy:${strategy}] ${side} ${symbolId} at price: ${bid}`)
                }
                break;
            case 'SELL':
                if (ask) {
                    redisPub.publish('crypto-ask', order);
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
        let key = await getKey({ exchange, symbolId, timeframe, position });
        if (key) {
            let signal = await redis.getAsync(key);
            return JSON.parse(signal);
        }
    }

    change({ open, close }) {
        return (close - open) / open * 100;
    }
};


const timeframesIntervals = {
    1: 60e3,
    5: 5 * 60e3,
    15: 15 * 60e3,
    60: 60 * 60e3,
    240: 240 * 60e3,
    [60 * 24]: 60 * 24 * 60e3,
};

async function getLastKey({ exchange, symbolId, timeframe, position = 0 }) {
    let key = await getKey.apply(null, arguments);
    if (key) {
        return key
    } else {
        return getLastKey({ exchange, symbolId, timeframe, position: position + 1 })
    }
}

async function getKey({ exchange, symbolId, timeframe, position = 0 }) {

    const time = new Date((Math.trunc((Date.now()) / timeframesIntervals[timeframe]) - position) * timeframesIntervals[timeframe])

    const timeKey = `${time.getDate()}/${time.getMonth() + 1}:${time.getHours()}h${time.getMinutes()}`;
    const key = `${exchange}:${symbolId}:${timeKey}:m${timeframe}`;

    if (await redis.existsAsync(key)) {
        return key
    }

}

