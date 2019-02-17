const _ = require('lodash');

const algo = require('..');

let timeRef = '_1h';
let in_ = 2;
let out = .5;
let last = null;
let log = []
let getFirst = (perfByTime) => _.first(_.orderBy(perfByTime[timeRef], perf => perf.change, 'desc'))

algo(function ({ perfByTime, getPerf, trade, prices, quantities }) {
const first=getFirst(perfByTime)
    if (!last) {
        if (first.change > in_) {
            last = first;
            buy()
        }
    } else {
        if (last.change > out && last.symbol === first.symbol) {
            in_ = _.max([in_, last.change]);
            out = in_ - 2
        } else {
            sell()
            last = null;
        }
    }
});

function buy() {
    log.push(last);
    last.open = last.change;
}

function sell() {
    last.close = last.change
    last.gain = last.close - last.open
}