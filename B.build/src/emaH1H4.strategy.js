const debug = require('debug')('strategy:emah1h4');

Template = require('./strategyBase');

module.exports = class extends Template {
    constructor(options) {
        super({ name: 'EMA H1H4', options })
    }

    async canBuy(signalH4) {
        const { exchange, symbolId, timeframe } = signalH4.candle;
        //timeframe H4
        if (+timeframe === 4 * 60 && signalH4.ema10Above20) {
            debug(`${symbolId} EMA H4 OK`);
            const signal24H = await this.findSignal({ exchange, symbolId, timeframe, position: 6 });
            //24H change must >2
            if (signal24H && this.change({ open: signal24H.candle.open, close: signalH4.candle.close }) > 2) {
                debug(`${symbolId} Change24h > 2% OK`);
                const signalH4_1 = await this.findSignal({ exchange, symbolId, timeframe, position: 1 });
                //crossing signal
                if (signalH4_1 && !signalH4_1.ema10Above20) {
                    debug(`${symbolId} EMA H4 Crossing OK`);
                    const signalH1 = await this.findSignal({ exchange, symbolId, timeframe: 60, position: 0 });
                    const signalH1_1 = await this.findSignal({ exchange, symbolId, timeframe: 60, position: 1 });

                    if (signalH1 && signalH1_1 && signalH1.ema10Above20 && signalH1_1.candle.ema10 < signalH1.candle.ema10) {
                        debug(`${symbolId} EMA H1 OK`);
                        debug(`${symbolId} EMA H1 Trend OK`);
                        let ticker = await this.getTicker({ exchange, symbolId });
                        if (ticker && ticker.bid) {                            
                            debug(`${symbolId} BID AT ${this.bid}`);
                            return Math.min(ticker.bid, signalH4.candle.open);
                        }
                    }

                }
            }
        }
    }
};

