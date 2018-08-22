const debug = require('debug')('A:load-signals');
const _ = require('lodash');
const { tradingView, publish } = require('common');

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

    // setInterval(throttledGetSignals, 1e3)

    throttledGetSignals();

    setTimeout(() => {
        throttledGetSignals();
        setInterval(throttledGetSignals, getRate(timeframe))
    }, getStartTime(timeframe))
}
);


function getStartTime(timeframe) {
    return (60e3 - Date.now() % 60e3) - 5e3;
}

function getRate(timeframe) {
    switch (+timeframe) {
        case 1:
            return 10e3;
        case 5:
            return 60e3;
        case 15:
            return 3 * 60e3;
        case 60:
            return 10 * 60e3;
        default:
            return 60 * 60e3;
    }
}


