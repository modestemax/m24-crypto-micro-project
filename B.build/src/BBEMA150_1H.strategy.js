const debug = require('debug')('B:strategy:bbema150_1h');

Template = require('./strategyBase');

module.exports = class extends Template {

    async canBuy(signal) {
        const { exchange, symbolId, timeframe, } = signal.candle;
        //timeframe H1
        if (+timeframe === 60) {
            const last = signal.candle;
            if (last) {
                if (last.ema100 < last.bbu20) {
                    if (last.ema10 >= last.bbb20) {
                        if (last.ema50 <= last.bbb20) {
                            if (signal.macdAboveSignal) {
                                if (last.ema100 >= last.close || last.ema50 >= last.close) {
                                    let ticker = await this.getTicker({ exchange, symbolId });
                                    if (ticker && ticker.bid) {
                                        debug(`${symbolId} BID AT ${ticker.bid}`);
                                        return ticker.bid;
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

