const debug = require('debug')('B:strategy-base');
const _ = require('lodash');

const [SELL, BUY] = ['SELL', 'BUY'];

const { publish, subscribe } = require('common/redis');
const { tradingView, candleUtils,  exchange, market, fetchTickers, fetchBalance } = require('common');
const { getAssetBalance } = market;
const { findSignal, loadCandles,computeChange,  valuePercent } = candleUtils;

const signals = {}
module.exports = class Strategy {
	constructor({ name, ...options }) {
		Object.assign(this, { bid: null, name, options, tickers: {}, prices: {}, });
		publish('m24:algo:loaded', `#${name} loaded`);
		this.logStrategyThrottled = _.throttle(this.logStrategy.bind(this), 1e3 * 60 * 5);
		this.subscribeOnce = _.once(subscribe);
		fetchTickers(this.onFetchTickers.bind(this));
	}
	get signals() {
		return signals
	}
	get signal() {
		return signals[+this.options.timeframe] || {};
	}
	onFetchTickers(price, assets) {
		Object.assign(this.tickers, assets);
		this.prices[price.info.symbol] = price;
		this.tick(price);
	}
	tick(price) { }
	async check(signal) {
		const { symbolId, timeframe, spread_percentage } = signal.candle;
		// const [current24] = (await loadPoints({ symbolId, timeframe: 60 * 24 }));

		this.lastCheck = signal;
		// const change24 = computeChange(current24.open, current24.close);
		// const change24Max = computeChange(current24.open, current24.high);

		// if (change24 > 2)
		// if (/*+timeframe === this.options.timeframe &&*/ spread_percentage < 1) {
			this.logStrategyThrottled(`I'm alive, checking ${this.lastCheck.candle.symbolId} now.`);
			this.subscribeOnce('m24:algo:check', (args) =>
				this.logStrategyThrottled(`I'm alive, checking ${this.lastCheck.candle.symbolId} now.`, args)
			);
			const last = signal.candle_1;
			const prev = signal.candle_2;
			const market = exchange.marketsById[symbolId];
			if (market) {
				let canBuy = await this.canBuy(signal.candle, last, prev, signal, this.tickers[market.symbol]);
				let canSell = await this.canSell(signal.candle, last, prev, signal, this.tickers[market.symbol]);

				if (canBuy || canSell) {
					let ticker = await this.getTicker({ symbolId });
					let bid = _.get(ticker, this.options.buyMode === 'limit' ? 'bid' : 'ask');
					let ask = _.get(ticker, this.options.sellMode === 'limit' ? 'ask' : 'bid');
					let now = _.get(ticker, 'now');
					canBuy && console.log(`${this.name} ${symbolId} BID AT ${bid} ${now} `);
					canSell && console.log(`${this.name} ${symbolId} ASK AT ${ask} ${now} `);

					Object.assign(this, { symbolId, bid, ask, timeframe });
					if (canBuy) {
						debug(`${this.name} Buy OK`);
						this.notifyBuy();
					} else if (canSell) {
						debug(`${this.name} Sell OK`);
						this.notifySell();
					}
				}
			}
		// }
	}
	selfSell(asset) {
		let ask;
		const { change, openPrice } = asset;
		if (change <= this.options.stopLoss) {
			ask = true;
		}
		ask = ask
			|| this.getSellPriceIfSellable(asset)
			|| valuePercent(openPrice, this.options.takeProfit);

		if (ask) {
			if (typeof ask === 'boolean') {
				delete asset.closePrice;
				publish('crypto:sell_market', asset);
			} else {
				asset.closePrice = ask;
				publish('crypto:sell_limit', asset);
			}
		}
	}

	getSellPriceIfSellable(asset) { }
	canBuy({ symbolId, timeframe }, last, prev, signal) { }
	canSell({ symbolId, timeframe }, last, prev, signal) { }
	async notifyBuy() {
		const market = exchange.marketsById[this.symbolId];
		const balance = getAssetBalance(market.base);
		const balanceBTC = getAssetBalance(market.quote, 'free');

		const { name: strategyName, options, bid, symbolId, timeframe } = this;
		!balance && this.logPairFound({ side: BUY, symbolId, price: bid, test: !options.doTrade });

		if (!balance && balanceBTC > market.limits.cost.min) {
			this.notify(BUY);
		} else if(!balance) {
			this.logStrategy(`Buy event not published, balance insufisante #${symbolId} #no_balance_${symbolId}`);
		}
	}
	async notifySell() {
		const market = exchange.marketsById[this.symbolId];
		const balance = getAssetBalance(market.base, 'free');
		if (balance) {
			this.notify(SELL);
		}
	}
	notify(side) {
		const { name: strategyName, options, ask: closePrice, bid: openPrice, symbolId, timeframe } = this;
		let order = { strategyName, openPrice, closePrice, symbolId, timeframe };

		const [price, event] = side === BUY ? [openPrice, 'crypto:buy_limit'] : [closePrice, 'crypto:sell_limit'];

		if (!['TUSDBTC', 'BNBBTC'].includes(symbolId)) {
			if (price && (side === SELL || options.doTrade)) {
				publish(event, order);
				this.logStrategy(`${side} event published #${symbolId}`);
				debug(`[strategy:${strategyName}] ${side} ${symbolId} at price: ${price}`);
			}
		} else {
			// this.StrategyLog("Can't trade BNB");
		}
	}

	logPairFound({ side, symbolId, price, test }) {
		publish(`m24:algo:pair_found`, {
			side,
			strategyName: this.name,
			symbolId,
			price: `${price.toFixed(8)} `,
			test
		});
	}
	async getTicker({ symbolId }) {
		let tick = await tradingView({ filter: symbolId });
		return tick[symbolId];
	}

	async getTickers(filter = 'btc$') {
		let tick = await tradingView({ filter });
		return tick;
	}
	logStrategy(text, options = {}) {
		publish(`m24:algo:tracking`, { strategyName: this.name, text, ...options });
		console.log(text);
	}

	async findSignal({ symbolId, timeframe, position }) {
		return findSignal({ symbolId, timeframe, position });
	}

	change({ open, close }) {
		return computeChange(open, close);
	}
	sorted(array) {
		return _.reduce(
			array,
			(sorted, val, i) => {
				let j = i + 1;
				if (j < array.length) {
					return sorted && array[i] < array[j];
				}
				return sorted;
			},
			true
		);
	}
};
