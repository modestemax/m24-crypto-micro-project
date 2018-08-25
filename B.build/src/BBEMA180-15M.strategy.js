const debug = require('debug')('B:strategy:bbema150-15M');

const { publish } = require('common/redis');
const Template = require('./strategyBase');
module.exports = class extends Template {

    async canBuy(signal) {
        const { exchange, symbolId, timeframe, } = signal.candle;
        //timeframe H1
        if (+timeframe === this.options.timeframe) {
            let tfSymbol = `#${symbolId} [${timeframe}]`;
            const last = signal.candle;
            const prev = signal.candle_1;
            if (last && prev) {
                if (prev.ema100 >= prev.ema10) {
                    publish('m24:algo:tracking', { strategyName: this.name, text: `${tfSymbol} (prev.ema100 >= prev.ema10)` });
                    if (last.ema100 < last.ema10) {
                        publish('m24:algo:tracking', { strategyName: this.name, text: `${tfSymbol} (last.ema100 < last.ema10)` });
                        if (last.ema30 >= last.ema50) {
                            publish('m24:algo:tracking', { strategyName: this.name, text: `${tfSymbol} (last.ema30 >= last.ema50)` });
                            if (last.macd > last.macdSignal) {
                                publish('m24:algo:tracking', { strategyName: this.name, text: `${tfSymbol} (last.macd > last.macdSignal)` });
                                if ((last.ema100 > last.bbb && last.close <= last.ema100) ||
                                    (last.ema100 < last.bbb && last.close <= last.ema30)) {
                                        publish('m24:algo:tracking', { strategyName: this.name, text: `${tfSymbol} [OK] ((last.ema100 > last.bbb && last.close <= last.ema100) ||
                                        (last.ema100 < last.bbb && last.close <= last.ema30))` });
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

