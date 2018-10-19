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
	async	setTracking({ id, open, symbolId, now, position, change_from_open, ...args }) {
		this._stopTrackings = this._stopTrackings || {};
		this._stopTrackings[id] = this._stopTrackings[id] || {};
		this._stopTrackings[id][symbolId] = { open, now, position, change_from_open };
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
						if (tracking) {
							if (!tracking.max_change_from_open) { return false }
							if (current.change_from_open < tracking.max_change_from_open) {
								return false;
							}
						}
						// if (current.close > (last.close + last.high) / 2)
						// if (
						// 	(new Date(current.now) - new Date(current.time)) / (1e3 * 60) <
						// 	this.options.timeframe / 2
						// )
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
		const H1 = 1e3 * 60 * 60;
		const M1 = 1e3 * 60;
		const price = this.prices[symbolId];
		const duration = Date.now() - timestamp;
		const current = _.get(this.signal, `[${symbolId}].candle`);
		// if ((maxChange - change) / maxChange > .5) {
		//     return true
		// }

		if (current) {
			this.setTracking({ ...current, max_change_from_open: computeChange(current.open, current.high) });
			if (current.position > this.options.min_position) {
				this.logStrategy(`#position_lost_${symbolId}\n${symbolId} has lost his position`);
				if (change > 0.3) {
					this.logStrategy(`${symbolId} trying to get ${change.toFixed(2)}% `);
					return valuePercent(openPrice, change);
				} else {
					if (maxChange > 0.5 && change >= 0) {
						this.logStrategy(`${symbolId} trying to get 0.3% `);
						return valuePercent(openPrice, 0.3);
					} else {
						this.logStrategy(`${symbolId} bad trade ask at market price `);
						return true;
					}
				}
			} else {

			}
		}
		if (maxChange - change > 3) {
			return true;
		}
		if (change < maxChange && minChange < 2 && change > 0.5 && change < 1) {
			return true;
		}
		if (change < this.options.stopLoss || (change <= -2 && maxChange <= 0)) {
			return true;
		}
		return valuePercent(openPrice, this.options.takeProfit);
	}
};
