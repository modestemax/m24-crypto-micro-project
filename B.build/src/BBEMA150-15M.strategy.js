const debug = require('debug')('B:strategy:bbema150-15M');

Template = require('./strategyBase');

module.exports = class extends Template {

    async canBuy(signal) {
        const { exchange, symbolId, timeframe, } = signal.candle;
        //timeframe H1
        if (+timeframe === this.options.timeframe) {
            const last = signal.candle;
            const signalH1_1 = await this.findSignal({ exchange, symbolId, timeframe: 60, position: 1 });
            const prev = signalH1_1 && signalH1_1.candle;
            if (last && prev) {
                if (prev.ema50 > prev.bbb20) {
                    if (last.ema100 < last.bbu20) {
                        if (last.ema10 >= last.bbb20) {
                            if (last.ema50 <= last.bbb20) {
                                if (last.macd > last.macdSignal) {
                                    if (last.ema100 >= last.close || last.ema50 >= last.close) {
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
    }
};

