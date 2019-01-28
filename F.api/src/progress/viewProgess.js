const prices = require('../progress/prices');

const viewing = {};

const change = (open, close) => (close - open) / open;
const changePercent = (open, close) => change(open, close) * 100;

module.exports = function ({ symbol, startAt }) {
    if (!viewing[symbol])
        viewing[symbol] = { symbol, startAt, change_max: -Infinity }
};

setInterval(function () {
    for (let symbol in viewing) {
        let vs = viewing[symbol];
        vs.change_prev = vs.change;
        vs.change = changePercent(vs.startAt, prices[vs.symbol]);
        vs.change_max = Math.max(vs.change, vs.change_max);
        if (vs.change !== vs.change_prev) {
            console.log(`${vs.symbol} ${vs.change.toFixed(2)}% | ${vs.change_max}%`)
        }
        if (vs.change < -2 || vs.change_max - vs.change > 2) {
            delete viewing[vs.symbol];
            console.log(`${vs.symbol} max= ${vs.change_max}%`)

        }
    }
}, 1000);