const debug = require('debug')('signals');
const redisLib = require('redis');
const _ = require('lodash');
const redisClient = redisLib.createClient();
const redisSub = redisClient.duplicate();
const strategies = require('./strategies');


redisSub.on('pmessage', async (pattern, channel, data) => {
    //debug(channel + ' received');
    if (/newData:.*/.test(channel)) {
        debug('data received');
        const signal = JSON.parse(data);
        for(let strategy in strategies){
            strategies[strategy].check(signal);
        } 
    }
});


redisSub.psubscribe('newData:*');