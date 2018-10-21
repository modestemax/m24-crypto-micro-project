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

    const SYMBOLID_SAMPLE = 'ADABTC';
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
            data => (process.emit('tv:signals', { markets: data, timeframe }), data),
            (err) => {
                publish('m24:error', { message: typeof err === 'string' ? err : err.message, stack: err.stack });
                console.error(err);
            }
        ).then((data) => data && console.log(`TV data loaded TF:${timeframe} id:${data[SYMBOLID_SAMPLE].id} time:${data['ADABTC'].time}  at:${data['ADABTC'].now} `),
            () => console.error('TV data load error TF:' + timeframe));

    getSignals();
    schedule.scheduleJob(getScheduleRule(timeframe), getSignals);
});


function getScheduleRule(timeframe) {
    // var parser = require('cron-parser');
    // var interval = parser.parseExpression('*/2 * * * *');
    // interval.next().toString()
    // interval.prev().toString()
    switch (+timeframe) {
        case 1:
            return '58,59,10,20,30,40,50 * * * * *'
        // return '56,57,58,59 * * * * *'
        case 5:
            //return '56,57,58,59 4,9,14,19,24,29,34,39,44,49,54,59 * * * *'
            //return '56,57,58,59 0,2,4,5,7,9,10,12,14,15,17,19,20,22,24,25,27,29,30,32,34,35,37,39,40,42,44,45,47,49,50,52,54,55,57,59 * * * *'
            return '15,30,45,58 * * * * *'
        case 15:
            //return '0,58,59 0,5,10,14,15,20,25,29,30,35,40,44,45,50,57,58,59 * * * *'
            // return '56,57,58,59 14,29,44,59 * * * *'
            // return '56,57,58,59 0,3,6,9,12,14,15,18,21,24,27,29,30,33,36,39,42,44,45,48,51,54,57,59 * * * *'
            return '30,58 * * * * *'
        case 60:
            //return '0,58,59 0,10,20,30,40,50,57,58,59 * * * *'
            // return '56,57,58,59 59 */1 * * *'
            // return '56,57,58,59 0,10,20,30,40,50,59 * * * *'
            return '58 * * * * *'
        case 60 * 4:
            // let tz = new Date().getTimezoneOffset() / 60;
            // let hours = [3, 7, 11, 15, 19, 23].map(q => (q - tz + 24) % 24).join();
            // return `56,57,58,59 59 ${hours} * * *`
            return '58 * * * * *'
        case 60 * 24:
            // let tz = new Date().getTimezoneOffset() / 60;
            // let hours = [3, 7, 11, 15, 19, 23].map(q => (q - tz + 24) % 24).join();
            // return `56,57,58,59 59 ${hours} * * *`
            // return '56,57,58,59 59 */1 * * *'  
            // return '0 * * * * *'
            return '58,59,10,20,30,40,50 * * * * *'
        default:
        //return '* */10 * * * *'
    }
    // return rule;
}



