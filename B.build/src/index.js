const debug = require('debug')('B:index');
const _ = require('lodash');
const strategies = require('./strategies');
const { getRedis, publish } = require('common');
const redisSub = getRedis();


redisSub.on('pmessage', async (pattern, channel, data) => {
    //debug(channel + ' received');
    if (/newData:.*/.test(channel)) {
        debug('data received', channel);
        const signal = JSON.parse(data);
        for (let strategy in strategies) {
            debug('checkin strategy', strategy, signal.symbolId, signal.timeframe);
            strategies[strategy].check(signal);
        }
    }
});


redisSub.psubscribe('newData:*');

debug('Strategies Running');

process.env.STATUS_OK_TEXT = "Strategy Checker is OK";