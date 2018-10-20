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
		if (current && last)
			if (+current.rating >= 0)
				if (current.position <= this.options.min_position)
					if (current.change_from_open > this.options.change_from_open_min)
						if (current.close > (last.close + last.high) / 2)
							if ((new Date(current.now) - new Date(current.time)) / (1e3 * 60) <
								this.options.timeframe * 3 / 4)
								return true;
	}

	async canSell({ symbolId, timeframe }, last, prev, signal) { }

	getSellPriceIfSellable(rawAsset) {
		const { change, maxChange, symbolId } = rawAsset;
		const SELL_AT_MARKET_PRICE = true;
		const current = _.get(this.signal, `[${symbolId}].candle`);

		if (current) {
			if (current.position > this.options.min_position) {
				//------------SORTI DU LE TOP------------------
				return SELL_AT_MARKET_PRICE;
			} else {
				//------------ENCORE DANS LE TOP------------------
				if (maxChange - change >= 3) {
					return SELL_AT_MARKET_PRICE
				}
			}
		}
	}
};
