const debug = require('debug')('B:strategy:bbemah1');

const Template = require('./strategyBase');

module.exports = class extends Template {
    // constructor(options) {
    //     super({ name: 'BBEMAH1', options })
    // }

    async canBuy(signalH1) {
        const { exchange, symbolId, timeframe, } = signalH1.candle;
        //timeframe H1
        if (+timeframe === 60) {
            const last = signalH1.candle;
            const prev = signal.candle_1;
            // const signalH1_1 = await this.findSignal({ exchange, symbolId, timeframe: 60, position: 1 });
            // const prev = signalH1_1 && signalH1_1.candle;
            if (last && prev) {
                if (prev.ema200 > prev.bbu20) {
                    if (last.ema200 < last.bbu20) {
                        if (last.macd > last.macdSignal) {
                            if (signalH1.macdAboveZero) {
                                // if (signalH1.rsiBelowHighRef) {
                                const signalH4 = await this.findSignal({ exchange, symbolId, timeframe: 4 * 60, position: 0 });
                                const lastH4 = signalH4.candle;
                                if (lastH4.macd > lastH4.macdSignal) {
                                    let ticker = await this.getTicker({ exchange, symbolId });
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
    }
    async  canSell(signalH1) {
        const { exchange, symbolId, timeframe, points } = signalH1.candle;
        //timeframe H1
        if (+timeframe === 60) {
            const last = signalH1.candle;
            const signalH1_1 = await this.findSignal({ exchange, symbolId, timeframe: 60, position: 1 });
            const prev = signalH1_1 && signalH1_1.candle;
            if (last && prev) {
                if (prev.ema50 <= prev.bbb20) {
                    if (last.ema50 > last.bbb20) {
                        if (signalH1.macdBelowSignal) {
                            if (last.ema200 < last.ema50) {
                                let ticker = await this.getTicker({ exchange, symbolId });
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
    }
};

