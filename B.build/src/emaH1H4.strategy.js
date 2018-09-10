const debug = require('debug')('B:strategy:emah1h4');

const Template = require('./strategyBase');

module.exports = class extends Template {
    // constructor(options) {
    //     super({ name: 'EMAH1H4', options })
    // }

    async canBuy({ symbolId, timeframe }, last, prev, signalH4, ticker) {
        const [candleH1, lastH1, prevH1] = [signalH4.candleH1, signalH4.candleH1_1, signalH4.candleH1_2];
        //timeframe H4
        if (last && prev && lastH1 && prevH1 && candleH1)
            if (last.ema10 > last.ema20) {
                debug(`${symbolId} EMA H4 OK`);
                //crossing signal
                if (prev.ema10 <= prev.ema20) {
                    debug(`${symbolId} EMA H4 Crossing OK`);
                    // const asset = await this.getAsset({ symbolId });
                    //24H change must >2
                    /*if (ticker && ticker.percentage > 2)*/ {
                        debug(`${symbolId} Change24h > 2% OK`);
                        // if (lastH1 && prevH1)
                        if (candleH1.ema10 > candleH1.ema20)
                            if (lastH1.ema10 > lastH1.ema20)
                                if (prevH1.ema10 < lastH1.ema10)
                                    if (last.ema10 < candleH1.ema10) {
                                        debug(`${symbolId} EMA H1 OK`);
                                        debug(`${symbolId} EMA H1 Trend OK`);
                                        let ticker = await this.getTicker({ symbolId });
                                        if (ticker && ticker.bid) {
                                            debug(`${symbolId} BID AT ${ticker.bid}`);
                                            return ticker.bid
                                            // return Math.min(ticker.bid, last.open);
                                        }
                                    }

                    }
                }
            }
    }
};

