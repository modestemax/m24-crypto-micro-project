const prices = require('../progress/prices');
const { publish } = require('common/redis');
const trades = {};
const ONE_MIN = 1e3 * 60
const change = (open, close) => (close - open) / open;
const changePercent = (open, close) => change(open, close) * 100;

module.exports = Object.assign(view, { trades });

function view({ symbol, open }) {
    if (!trades[symbol])
        trades[symbol] = { symbol, open, time: Date.now(), change_max: -Infinity }
};

setInterval(function () {
    Object.values(trades).forEach(function (trade) {
        trade.change_prev = trade.change;
        trade.change = changePercent(trade.startAt, prices[trade.symbol]);
        trade.change_max = Math.max(trade.change, trade.change_max);
        if (trade.change !== trade.change_prev) {
            console.log(`${trade.symbol} ${trade.change.toFixed(2)}% | ${trade.change_max.toFixed(2)}%`)
            publish('TRADE_PROGRESS', trade)
        }
        if (trade.change < 0 && (Date.now() - trade.time) > ONE_MIN * 30) {
            delete trades[trade.symbol];
            console.log(`${trade.symbol} max= ${trade.change_max.toFixed(2)}%`)
            publish('TRADE_END', trade)
        }
    });
}, 1000);