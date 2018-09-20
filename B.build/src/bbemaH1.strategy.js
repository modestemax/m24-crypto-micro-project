const debug = require('debug')('B:strategy:bbemah1');

const Template = require('./strategyBase');

module.exports = class extends Template {
    // constructor(options) {
    //     super({ name: 'BBEMAH1', options })
    // }

    async canBuy({ symbolId, timeframe }, last, prev) {
        if (last && prev) {
            if (prev.ema200 > prev.bbu20) {
                if (last.ema200 < last.bbu20) {
                    if (last.macd > last.macd_signal) {
                        if (last.macd > 0) {
                            // if (signalH1.rsiBelowHighRef) {
                            const signalH4 = await this.findSignal({  symbolId, timeframe: 4 * 60, position: 0 });
                            const lastH4 = signalH4.candle;
                            if (lastH4.macd > lastH4.macd_signal) {
                                let ticker = await this.getTicker({  symbolId });
                                if (ticker && ticker.ask) {
                                    debug(`${symbolId} BID AT ${ticker.ask}`);
                                    return ticker.ask;
                                }
                            }
                            // }
                        }
                    }
                }
            }
        }
    }
    async  canSell({  symbolId, timeframe }, last, prev) {
        if (last && prev) {
            if (prev.ema50 <= prev.bbb20) {
                if (last.ema50 > last.bbb20) {
                    if (last.macd > last.macd_signal) {
                        if (last.ema200 < last.ema50) {
                            let ticker = await this.getTicker({  symbolId });
                            if (ticker && ticker.bid) {
                                debug(`${symbolId} ASK AT ${ticker.bid}`);
                                return ticker.bid
                            }
                        }
                    }
                }
            }
        }
    }
};

