const { subscribe, } = require('common/redis');
const { changePercent } = require('common').candleUtils;
const _ = require('lodash');
const Promise = require('bluebird');
const binance = Promise.promisifyAll(require('../init-binance'));
const prices = require('../progress/prices');
const quantities = require('../progress/quantities');
const viewProgess = require('../progress/viewProgess');

const MAX_SPREAD = .6
const SATOSHI = 1e-8
let perfByTime;
const algos = [];
let allSymbolsCandles = {}

module.exports = function (algo) {
    !algos.includes(algo) && algos.push(algo)
};

let runalgo = (options) => algos.forEach(algo => algo(options));



subscribe('prevPerf', perfs => {
    // debugger;
    let perfByTimeGoodSpread = {}
    perfByTime = _(perfs).reduce((perfByTime, perf) => {
        let close;
        _.forEach(perf, (perf, time) => {
            close = perf.close
            perfByTime[time] = (perfByTime[time] || []).concat(perf)

            if (changePercent(close, close + SATOSHI) < MAX_SPREAD) {
                perfByTimeGoodSpread[time] = (perfByTimeGoodSpread[time] || []).concat(perf)
            }
        });


        return perfByTime;
    }, {});

    perfByTime = _.mapValues(perfByTime, perfs => _.orderBy(perfs, 'change', 'desc'));
    perfByTimeGoodSpread = _.mapValues(perfByTimeGoodSpread, perfs => _.orderBy(perfs, 'change', 'desc'));
    runalgo({ perfByTime, perfByTimeGoodSpread, getPerf, trade, prices, quantities });
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