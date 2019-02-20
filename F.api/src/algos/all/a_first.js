const _ = require('lodash');

const algo = require('..');

let timeRef = 'day';

let in_;
let out;
let stop;
let last = null;

let first = null;
let log = []
const FAST_GROW = 2
const STOP_LOSS = -2

const getFirst = (perfByTime) => _.first(_.orderBy(perfByTime[timeRef], perf => perf.change, 'desc'))


init()
algo(function ({ perfByTime, perfByTimeGoodSpread, getPerf, trade, prices, quantities }) {
    first = getFirst(perfByTimeGoodSpread)
    if (!last) {
        if (first.change > in_) {
            buy()
        }
    } else {
        Object.assign(last, getPerf(last.symbol, timeRef))
        calculateGain()
        if (last.gain > STOP_LOSS && last.symbol === first.symbol) {
            in_ = _.max([in_, last.change]);
            out = in_ - 2
        } else if (!(last.gain > STOP_LOSS) || first.change - last.change > 1) {
            sell()
        }
    }
});

function init() {
    last = null;
    stop = 4
    in_ = 2.5
    out = in_ - stop
}

function buy() {
    last = first;
    log.push(last);
    last.openPercent = last.change;
    publish(`m24:algo:tracking`, {
        strategyName: 'm24first',
        text: `#${log.length}buy ${last.symbol} at ${last.close} [${last.change.toFixed(2)}%]`
    });
}

function sell() {
    last.closePercent = last.change
    calculateGain()
    publish(`m24:algo:tracking`, {
        strategyName: 'm24first',
        text: `#${log.length}sell  ${last.symbol} at ${last.close}
         gain ${last.gain.toFixed(2)}% 
         Max gain ${last.maxGain.toFixed(2)}% 
        [${last.change.toFixed(2)}%] [next buy at ${in_.toFixed(2)}%]`
    });
    last = null;
}

function calculateGain() {
    last.prevGain = last.gain
    last.gain = last.change - last.openPercent
    last.maxGain = _.max([last.gain, last.maxGain])
}