
const debug = require('debug')('B:index');
const _ = require('lodash');
const strategies = require('./strategies');
const { subscribe: redisSubscribe, publish } = require('common/redis');

redisSubscribe('newData:*', {
    'newData:.*': function (signal, channel) {
        // console.log('signal received '+signal.timeframe+'  '+signal.symbolId)
        debug('data received', channel);
        for (let [name, strategy] of Object.entries(strategies)) {
            debug('checkin strategy', strategy, signal.symbolId, signal.timeframe);
            if (+signal.timeframe === +strategy.options.timeframe) {
                strategy.signal[signal.symbolId] = signal;
                strategy.check(signal);
            }
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

