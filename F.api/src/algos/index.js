const { subscribe } = require('common/redis');
const _ = require('lodash');
const Promise = require('bluebird');
const binance = Promise.promisifyAll(require('../init-binance'));
const prices = require('../progress/prices');
const quantities = require('../progress/quantities');
const viewProgess = require('../progress/viewProgess');

let perfByTime;
const algos = [];


module.exports = function (algo) {
    !algos.includes(algo) && algos.push(algo)
};

let runalgo = (options) => algos.forEach(algo => algo(options));


subscribe('prevPerf', perfs => {
    // debugger;
    perfByTime = _(perfs).reduce((perfByTime, perf) => {
        _.forEach(perf, (perf, time) => {
            perfByTime[time] = (perfByTime[time] || []).concat(perf)
        });
        return perfByTime;
    }, {});
    perfByTime = _.mapValues(perfByTime, perfs => _.orderBy(perfs, 'change', 'desc'));
    runalgo({ perfByTime, getPerf, trade, prices, quantities });
    // debugger
});

function getPerf(symbol, time) {
    let perf = _.find(perfByTime[time], { symbol });
    return perf && perf.change
}

async function trade({ symbol, price, quantity, percentageExpected, maxWaitBuyTime }) {
    let cancelOrderIfDelay = maxWaitBuyTime ? () => setTimeout(() => binance.cancelOrders(symbol), maxWaitBuyTime) : _.noop
    if (!(symbol in trade.trades)) {
        process.nextTick(() => viewProgess({ symbol, open: price }))
        try {
            trade.trades = Object.assign({}, { symbol }, trade.trades)
            await binance.buyAsync(symbol, price, quantity)
            cancelOrderIfDelay()
            process.nextTick(quantities.check);
        } catch (e) {
            delete trade.trades[symbol]
           // delete viewProgess.trades[symbol]
        }
        try {
            await binance.sellAsync(symbol, addPercentage(price, percentageExpected), quantity)
            process.nextTick(quantities.check);
        } catch (e) {

        }
    }
}

function addPercentage(price, percentage) {
    return price * (1 + percentage / 100)
}