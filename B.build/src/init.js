
const debug = require('debug')('B:index');
const _ = require('lodash');
const strategies = require('./strategies');
const { subscribe: redisSubscribe, publish } = require('common/redis');

redisSubscribe('newData:*', {
    'newData:.*': function (signal, channel) {
        if (signal.candle.position_good_spread < 5) {
            console.log(`signal received tf:${signal.timeframe} ${signal.symbolId} rang:${signal.candle.position_good_spread}/${signal.candle.position} change:${signal.candle.change_from_open.toFixed(2)}`)
            debug('data received', channel);
        }

        for (let [name, strategy] of Object.entries(strategies)) {
            debug('checkin strategy', strategy.name, signal.symbolId, signal.timeframe);
            strategy.signals[+signal.timeframe] = strategy.signals[+signal.timeframe] || {};
            strategy.signals[+signal.timeframe][signal.symbolId] = signal;

            if (_.compact([strategy.options.timeframe].concat(strategy.options.timeframes)).includes(+signal.timeframe)) {
                if (signal.candle.spread_percentage < 1)
                    strategy.check(signal);
            }
        }
    }
});
redisSubscribe('crypto:self_stop', (asset) => {
    for (let [name, strategy] of Object.entries(strategies)) {
        debug('checkin if asset is sellable', asset.symbolId);
        if (asset.strategyName === name) {
            strategy.selfSell(asset);
        }
    }
});

