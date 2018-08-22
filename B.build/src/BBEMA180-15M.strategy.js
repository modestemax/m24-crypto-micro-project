const debug = require('debug')('B:strategy:bbema150-15M');

Template = require('./strategyBase');

module.exports = class extends Template {

    async canBuy(signal) {
        const { exchange, symbolId, timeframe, } = signal.candle;
        //timeframe H1
        if (+timeframe === this.options.timeframe) {
            const last = signal.candle;
            const prev = signal.candle_1;
            if (last && prev) {
                if (prev.ema100 >= prev.ema10) {
                    if (last.ema100 < last.ema10) {
                        if (last.ema30 > last.ema50) {
                            if (last.macd > last.macdSignal) {
                                if ((last.ema100 > last.bbb && last.close <= last.ema100) ||
                                    (last.ema100 < last.bbb && last.close <= last.ema30)) {
                                    let ticker = await this.getTicker({ exchange, symbolId });
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
    }
};

