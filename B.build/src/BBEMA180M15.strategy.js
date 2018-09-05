const debug = require('debug')('B:strategy:bbema150-15M');

const { publish } = require('common/redis');
const Template = require('./strategyBase');
module.exports = class extends Template {

    async canBuy({ symbolId, timeframe }, last, prev) {

        if (last && prev) {
            if (prev.ema100 >= prev.ema10) {
                if (last.ema100 < last.ema10) {
                    if (last.ema30 >= last.ema50) {
                        if (last.macd > last.macdSignal) {
                            if ((last.ema100 > last.bbb && last.close <= last.ema100) ||
                                (last.ema100 < last.bbb && last.close <= last.ema30)) {
                                let ticker = await this.getTicker({ symbolId });
                                if (ticker && ticker.ask) {
                                    debug(`${symbolId} BID AT ${ticker.ask}`);
                                    return ticker.ask;
                                }
                            }
                        }
                    }
                }
            }
        }
    }
};

