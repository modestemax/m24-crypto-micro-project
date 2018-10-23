const debug = require('debug')('A:builder');
const _ = require('lodash');


const { redisSet, redisGet,publish } = require('common/redis');
const { candleUtils } = require('common');
const { getNewCandleId, loadCandles, saveCandles } = candleUtils;
const allCandles = {};
const LIMIT_CANDLES_COUNT = 3;

process.on('tv:signals', ({ markets, timeframe }) => {
    publish('tv:signals',{ markets, timeframe });
    _.forEach(markets, async (signal, symbolId) => {
        const candles = allCandles[`${symbolId}:${timeframe}`]
            = allCandles[`${symbolId}:${timeframe}`]
            || await loadCandles({ symbolId, timeframe })
            || [];

        if (_.get(candles, '[0].id') === signal.id) {
            _.extend(_.first(candles), signal);
        } else {
            candles.unshift(signal);
            candles.splice(LIMIT_CANDLES_COUNT);
        }
     const   [candle, candle_1, candle_2, candle_3] = candles;
        process.emit('analyse:newData', { candle, candle_1, candle_2, candle_3 });
        saveCandles({ symbolId, timeframe, candles })
    })
});
{ }


