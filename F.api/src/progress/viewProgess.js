const prices = require('../progress/prices');

const viewing = {};

const change = (open, close) => (close - open) / open;
const changePercent = (open, close) => change(open, close) * 100;

module.exports = function ({ symbol, startAt }) {
    if (!viewing[symbol])
        viewing[symbol] = { symbol, startAt }
};

setInterval(function () {
    for (let symbol in viewing) {
        let vs = viewing[symbol];
        vs.change_prev = vs.change;
        vs.change = changePercent(vs.startAt, prices[vs.symbol]);
        if (vs.change !== vs.change_prev) {
            console.log(`${vs.symbol} ${vs.change.toFixed(2)}%`)
        }
        if (vs.change < -2) {
            delete viewing[vs.symbol]
        }
    }
}, 1000);