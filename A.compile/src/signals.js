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
    // const throttledGetSignals = _.throttle(() =>
    //     tradingView({ timeframe, filter: SYMBOLS_FILTER, exchangeId: EXCHANGE })
    //         .then(
    //             data => process.emit('tv:signals', { markets: data, timeframe }),
    //             (err) =>
    //                 publish('m24:error', { message: typeof err === 'string' ? err : err.message, stack: err.stack })
    //         )
    //     , 10e3);

    const getSignals = () => tradingView({ timeframe, filter: SYMBOLS_FILTER, exchangeId: EXCHANGE })
        .then(
            data => process.emit('tv:signals', { markets: data, timeframe }),
            (err) =>
                publish('m24:error', { message: typeof err === 'string' ? err : err.message, stack: err.stack })
        ).then((data)=>console.log('TV data loaded TF:'+timeframe),()=>console.error('TV data load error TF:'+timeframe));

    getSignals();
    schedule.scheduleJob(getScheduleRule(timeframe), getSignals);
});


function getScheduleRule(timeframe) {

    switch (+timeframe) {
        case 1:
            return '56,57,58,59 * * * * *'
        case 5:
            return '56,57,58,59 4,9,14,19,24,29,34,39,44,49,54,59 * * * *'
        case 15:
            //return '0,58,59 0,5,10,14,15,20,25,29,30,35,40,44,45,50,57,58,59 * * * *'
            return '56,57,58,59 14,29,44,59 * * * *'
        case 60:
            //return '0,58,59 0,10,20,30,40,50,57,58,59 * * * *'
            return '56,57,58,59 59 */1 * * *'
        case 60 * 4:
            return '56,57,58,59 59 3,7,11,15,19,23 * * *'
        default:
        //return '* */10 * * * *'
    }
    // return rule;
}



