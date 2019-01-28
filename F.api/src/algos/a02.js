const _ = require('lodash');

const algo = require('./index');
const prices = require('../progress/prices');
const viewProgess = require('../progress/viewProgess');

let timeRef = 'h2';
let changeRef = 3;
let oldFound = [];
// const times = ['m5', 'm15', 'm30', 'h1', 'h2', 'h4', 'h6', 'h8', 'h12', 'h24'];
algo(function (perfByTime) {
    // debugger

    let found = [];
    let top = _.filter(perfByTime[timeRef], perf => perf.change > changeRef);
    _.forEach(top, perf => {
        let [h1, m30, m15, m5, m3, m2, m1] = ['h1', 'm30', 'm15', 'm5', 'm3', 'm2', 'm1'].map(t => getPerf(perf.symbol, t))
        // if (h1 > 1.5) if (m30 > 1) if (m15 > 1) if (m5 > .5) if (m3 > .2) if (m2 > .2) if (m1 > .1)
        if (h1 > 1.5) if (m30 > 1) if (m15 > 1) if (m5 > 1) if (m3 > .5) if (m2 > .2) if (m1 > .2)
        // if (m1 < 2)
        // if (h1 > m30) if (m30 > m15) if (m15 > m5) if (m5 > m3) if (m3 > m2) if (m2 > m1)
            prices[perf.symbol] && found.push(perf.symbol)
    });
    if (found.length) {

        console.log(found.map(symbol => `${symbol} ${prices[symbol]}`));
        found.forEach(symbol => viewProgess({ symbol, startAt: prices[symbol] }))
    }


    function getPerf(symbol, time) {
        let perf = _.find(perfByTime[time], { symbol });
        return perf && perf.change
    }
});
