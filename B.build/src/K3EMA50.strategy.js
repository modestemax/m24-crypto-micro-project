const debug = require('debug')('B:strategy:bbema150-15M');

const Template = require('./strategyBase');

module.exports = class extends Template {

    async canBuy({ exchange, symbolId, timeframe }, last, prev) {

        // const signalH1_1 = await this.findSignal({ exchange, symbolId, timeframe: 60, position: 1 });
        // const prev = signalH1_1 && signalH1_1.candle;
        if (last && prev)
            if (prev.ema50 <= prev.bb20)
                if (last.ema50 > last.bb20)
                    if (last.macd < last.macdSignal) {
                        let ticker = await this.getTicker({ exchange, symbolId });
                        if (ticker && ticker.bid) {
                            debug(`${symbolId} BID AT ${ticker.bid}`);
                            return ticker.bid;
                        }
                        // this.pairFound({ side: 'BUY', symbolId, price: ticker.bid })
                    }
    }
};

