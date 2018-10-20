const debug = require('debug')('B:strategy:bbema150-15M');

const M24Base = require('./m24Base');
const _ = require('lodash');
const { publish, subscribe, redisSet, redisGet } = require('common/redis');
const { candleUtils, saveDatum, exchange, humanizeDuration } = require('common');
const { computeChange, valuePercent } = candleUtils;

const redisSetThrottle = _.throttle(redisSet, 1e3 * 2);

module.exports = class extends M24Base {
	constructor(...args) {
		super(...args);
	}
	async	setTracking({ id, open, symbolId, now, position, change_from_open, last_sell_change, ...args }) {
		this._stopTrackings = this._stopTrackings || {};
		this._stopTrackings[id] = this._stopTrackings[id] || {};
		this._stopTrackings[id][symbolId] = { symbolId, open, now, position, change_from_open, last_sell_change };
		redisSetThrottle({
			key: this.getTrackKey(id),
			data: await this.getTrackings(id),
			expire: 60 * 60 * 24 * 7
		});
	}
	hasTracking({ id, open, symbolId, ...args }) {
		return _.get(this._stopTrackings[id], symbolId);
	}
	getTracking({ id, symbolId }) {
		return _.get(this._stopTrackings, `${id}[${symbolId}]`);
	}

	async getTrackings(id) {
		if (this._stopTrackings) {
			return this._stopTrackings;
		} else {
			this._stopTrackings = (await redisGet(this.getTrackKey(id))) || { [id]: {} };
		}
	}
	getTrackKey(id) {
		return `m24trackings_${this.name}_${id}`;
	}
	async canBuy({ symbolId, timeframe }, last, prev, signal) {
		let current = signal.candle;
		await this.getTrackings(current.id);
		let tracking = this.getTracking(current);
		if (current && last)
			if (+current.rating >= 0)
				if (current.position <= this.options.min_position)
					if (current.change_from_open > this.options.change_from_open_min) {
						let canBuy;
						if (tracking) {
							[1, 5, 15, 60, 60 * 4].reduce((canBuy, timeframe) => {
								const currentX = this.signals[timeframe] && this.signals[timeframe][symbolId].candle;
								const lastX = this.signals[timeframe] && this.signals[timeframe][symbolId].candle_1;
								if (currentX && canBuy)
									if (+currentX.rating >= 0)
										if (currentX.change_from_open > 0)
											if (computeChange(currentX.open, currentX.high) - currentX.change_from_open <= current.spread_percentage)
												if (currentX.close > (lastX.close + lastX.high) / 2)
													return true
								return false
							}, true)

							if (!canBuy) {
								return false;
							}
						}
						//-----------------------
						// if (tracking) {
						// 	if (!tracking.last_sell_change) {
						// 		tracking.last_sell_change = current.change_from_open + 1;
						// 		redisSet({
						// 			key: this.getTrackKey(current.id),
						// 			data: await this.getTrackings(current.id),
						// 			expire: 60 * 60 * 24 * 7
						// 		});
						// 		return false
						// 	}
						// 	if (current.change_from_open < tracking.last_sell_change) {
						// 		return false;
						// 	}

						// }
						//---------------------------
						// if (current.close > (last.close + last.high) / 2)
						if (
							(new Date(current.now) - new Date(current.time)) / (1e3 * 60) <
							this.options.timeframe * 3 / 4
						)
							// if (!this.hasTracking(current))
							// const change = computeChange(current.open, current.close);
							// const changeMax = computeChange(current.open, current.high);

							//if (change > this.options.enterThreshold && changeMax - change < 1)
							// if (current.close > last.high)
							// if (current.close > (_.max([last.open, last.close]) + last.high) / 2)
							if (true) {
								this.setTracking(current);
								return true;
							}
					}
	}

	async canSell({ symbolId, timeframe }, last, prev, signal) { }

	getSellPriceIfSellable(rawAsset) {
		const { change, maxChange, minChange, openPrice, closePrice, symbolId, timestamp } = rawAsset;
		const SELL_AT_MARKET_PRICE = true;

		const H1 = 1e3 * 60 * 60;
		const M1 = 1e3 * 60;
		const price = this.prices[symbolId]||{};
		const duration = Date.now() - timestamp;
		const current = _.get(this.signal, `[${symbolId}].candle`);
		// if ((maxChange - change) / maxChange > .5) {
		//     return true
		// }
		const market = computeChange(openPrice, price.ask);

		if (current) {
			this.setTracking({ ...current, last_sell_change: current.change_from_open });

			//------------SORTI DU LE TOP------------------
			if (current.position > this.options.min_position) {
				this.logStrategy(`#position_lost_${symbolId}\n${symbolId} has lost his position`);

				if (price && market > .3) {
					return SELL_AT_MARKET_PRICE
				}
				if (change > 0.3) {
					this.logStrategy(`${symbolId} trying to get ${change.toFixed(2)}% `);
					return valuePercent(openPrice, change);
				} else {
					if (maxChange > 0.5 && change >= 0) {
						this.logStrategy(`${symbolId} trying to get 0.3% `);
						return valuePercent(openPrice, 0.3);
					} else {
						this.logStrategy(`${symbolId} bad trade ask at market price `);
						return SELL_AT_MARKET_PRICE;
					}
				}
			} else {

			}
		}

		//------------ENCORE DANS LE TOP------------------
		if (change < maxChange) {
			if (maxChange > 1.5 && change < 1 && market > .3) {
				return SELL_AT_MARKET_PRICE
			}


			if (maxChange - change > 1 && market > .3) {
				return SELL_AT_MARKET_PRICE;
			}
			if (minChange < -2 && change > 0.5 && change < 1) {
				return SELL_AT_MARKET_PRICE;
			}
			if (change <= -2 && maxChange <= 0) {
				return SELL_AT_MARKET_PRICE;
			}
		}

	}
};
