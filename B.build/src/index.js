const debug = require('debug')('signals');
const _ = require('lodash');
const strategies = require('./strategies');
const { getRedis } = require('common');
const redisSub = getRedis();


redisSub.on('pmessage', async (pattern, channel, data) => {
    //debug(channel + ' received');
    if (/newData:.*/.test(channel)) {
        debug('data received', channel);
        const signal = JSON.parse(data);
        for (let strategy in strategies) {
            debug('checkin strategy', strategy, signal.symbolId);
            strategies[strategy].check(signal);
        }
    }
});


redisSub.psubscribe('newData:*');