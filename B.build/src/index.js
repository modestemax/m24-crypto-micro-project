const debug = require('debug')('B:index');
const _ = require('lodash');
const strategies = require('./strategies');
const { subscribe: redisSubscribe, publish } = require('common/redis');


redisSubscribe('newData:.*', {
    'newData:.*': function (signal) {
        debug('data received', channel);
        for (let strategy in strategies) {
            debug('checkin strategy', strategy, signal.symbolId, signal.timeframe);
            strategies[strategy].check(signal);
        }
    }
});

console.log(process.env.APP_NAME+ ' Running '+ new Date());