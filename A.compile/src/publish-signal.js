const debug = require('debug')('A:save-signal');
const _ = require('lodash');
const { candleUtils } = require('common');
const { publish, redisSet } = require('common/redis');
const { getKeyById } = candleUtils;



process.on('analyse:newData', async (signal) => {
    const { exchange, symbolId, timeframe, id } = signal.candle;

    const key = getKeyById({ exchange, symbolId, timeframe, id });
    _.extend(signal, {
        __key__: key,
        __prev_key__: getKeyById({ exchange, symbolId, timeframe, id: id - 1 }),
    });    
    await publish(`newData:m${timeframe}`, signal);  
});


