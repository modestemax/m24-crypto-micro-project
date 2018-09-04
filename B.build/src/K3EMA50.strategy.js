const debug = require('debug')('B:strategy:bbema150-15M');

const Template = require('./strategyBase');

module.exports = class extends Template {

    async canBuy({ symbolId, timeframe }, last, prev) {
        if (last && prev)
            if (prev.ema50 <= prev.bb20)
                if (last.ema50 > last.bb20)
                    if (last.macd < last.macdSignal) {
                        let ticker = await this.getTicker({  symbolId });
                        if (ticker && ticker.bid) {
                            debug(`${symbolId} BID AT ${ticker.bid}`);
                            return ticker.bid;
                        }
                        // this.pairFound({ side: 'BUY', symbolId, price: ticker.bid })
                    }
    }
};

