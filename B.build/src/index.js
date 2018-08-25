console.log('\n\n' + process.env.APP_NAME + ' Running ' + new Date() + '\n\n');

const debug = require('debug')('B:index');
const _ = require('lodash');
const strategies = require('./strategies');
const { subscribe: redisSubscribe, publish } = require('common/redis');


redisSubscribe('newData:*', {
    'newData:.*': function (signal, channel) {
        debug('data received', channel);
        for (let strategy in strategies) {
            debug('checkin strategy', strategy, signal.symbolId, signal.timeframe);
            strategies[strategy].check(signal);
        }
    }
});
redisSubscribe('crypto:self_stop', (asset) => {
    for (let strategy in strategies) {
        debug('checkin if asset is sellable', asset.symbolId);
        if (asset.strategyName === strategy) {
            strategies[strategy].selfSell(asset);
        }
    }
});

