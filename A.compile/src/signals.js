const debug = require('debug')('A:load-signals');
const _ = require('lodash');
var schedule = require('node-schedule');
const { tradingView } = require('common');
const { publish } = require('common/redis');

const EXCHANGE = 'binance';

let { SYMBOLS_FILTER, TIMEFRAMES, } = process.env;

console.log("TIMEFRAMES", TIMEFRAMES)
publish('m24:timeframe', TIMEFRAMES)
TIMEFRAMES.split(',').forEach((timeframe) => {
    timeframe = +timeframe;

    //get signal max 1 time per second
    const throttledGetSignals = _.throttle(() =>
        tradingView({ timeframe, filter: SYMBOLS_FILTER, exchangeId: EXCHANGE })
            .then(
                data => process.emit('tv:signals', { markets: data, timeframe }),
                (err) =>
                    publish('m24:error', { message: typeof err === 'string' ? err : err.message, stack: err.stack })
            )
        , 10e3);

    throttledGetSignals();
    schedule.scheduleJob(getScheduleRule(timeframe), throttledGetSignals);
});


function getScheduleRule(timeframe) {

    switch (+timeframe) {
        case 1:
            return '0,58,59 * * * * *'
        case 5:
            return '0,58,59 0,5,10,15,20,25,30,35,40,45,50,57,58,59 * * * *'
        case 15:
            return '0,58,59 0,5,10,14,15,20,25,29,30,35,40,44,45,50,57,58,59 * * * *'
        case 60:
            return '0,58,59 0,10,20,30,40,50,57,58,59 * * * *'
        case 60 * 4:
            return '0,58,59 0,59 */1 * * *'
        default:
        //return '* */10 * * * *'
    }
    // return rule;
}



