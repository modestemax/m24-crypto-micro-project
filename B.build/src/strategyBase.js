const debug = require('debug')('B:strategy-base');
const _ = require('lodash');

const { publish, subscribe } = require('common/redis');
const { tradingView, candleUtils, computeChange, exchange, market, fetchTickers, fetchBalance } = require('common');
const { getAssetBalance } = market;
const { findSignal } = candleUtils;
const tickers = {};
// const assets = {};

fetchTickers((price, _tickers) => Object.assign(tickers, _tickers));
// fetchBalance(_bal => Object.assign(assets, _bal));

module.exports = class Strategy {

    constructor({ name, ...options }) {
        Object.assign(this, { bid: null, name, options });
        publish('m24:algo:loaded', `#${name} loaded`);
        this.StrategyLogThrottled = _.throttle(this.StrategyLog.bind(this), 1e3 *5);
        this.subscribeOnce = _.once(subscribe)
    }

    async check(signal) {
        const { symbolId, timeframe, spreadPercentage } = signal.candle;
        if (+timeframe === this.options.timeframe && spreadPercentage < 1) {
            this.subscribeOnce('m24:algo:check', (args) =>
                this.StrategyLogThrottled(`I'm alive, checking ${symbolId} now.`, args));
            const last = signal.candle_1;
            const prev = signal.candle_2;
            const market = exchange.marketsById[symbolId];
            if (market) {
                let bid = await this.canBuy(signal.candle, last, prev, signal, tickers[market.symbol]);
                let ask = await this.canSell(signal.candle, last, prev, signal, tickers[market.symbol]);

                Object.assign(this, { symbolId, bid, ask, timeframe });
                if (bid) {
                    debug(`${this.name} Buy OK`);
                    this.notifyBuy();
                } else if (ask) {
                    debug(`${this.name} Sell OK`);
                    this.notifySell();
                }
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
    canBuy({ symbolId, timeframe }, last, prev, signal) { }
    canSell({ symbolId, timeframe }, last, prev, signal) { }
    async notifyBuy() {
        const market = exchange.marketsById[this.symbolId];
        const balance = getAssetBalance(market.base);
        const balanceBTC = getAssetBalance(market.quote, 'free');
        if (!balance && balanceBTC > market.limits.cost.min) {
            this.notify('BUY');
        }
    }
    async notifySell() {
        const market = exchange.marketsById[this.symbolId];
        const balance = getAssetBalance(market.base, 'free');
        if (balance) {
            this.notify('SELL')
        }
    }
    notify(side) {
        const { name: strategyName, options, ask: closePrice, bid: openPrice, symbolId, timeframe } = this;
        let order = ({ strategyName, openPrice, closePrice, symbolId, timeframe });

        const [price, event] = side === 'BUY' ? [openPrice, 'crypto:buy_limit'] : [closePrice, 'crypto:sell_limit'];


        if (!['TUSDBTC', 'BNBBTC'].includes(symbolId)) {
            if (price && this.pairFound({ side, symbolId, price, test: !options.doTrade }) && options.doTrade) {
                publish(event, order);
                this.StrategyLog('Buy event published #' + symbolId)
                debug(`[strategy:${strategyName}] ${side} ${symbolId} at price: ${price}`)
            }
        } else {
            // this.StrategyLog("Can't trade BNB");
        }
    }

    pairFound({ side, symbolId, price, test }) {
        publish(`m24:algo:pair_found`, { side, strategyName: this.name, symbolId, price: `${price.toFixed(8)} `, test });
        return true;
    }
    async getTicker({ symbolId }) {
        let tick = await tradingView({ filter: symbolId });
        return tick[symbolId]
    }

    StrategyLog(text, options = {}) {
        publish(`m24:algo:tracking`, { strategyName: this.name, text, ...options });
    }

    async findSignal({ symbolId, timeframe, position }) {
        return findSignal({ symbolId, timeframe, position })
    }

    change({ open, close }) {
        return computeChange(open, close);
    }
    sorted(array) {
        return _.reduce(array, (sorted, val, i) => {
            let j = i + 1;
            if (j < array.length) {
                return sorted && array[i] < array[j];
            }
            return sorted;
        }, true)
    }
};