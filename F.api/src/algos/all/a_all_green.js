const _ = require('lodash');

const algo = require('..');
const prices = require('../../progress/prices');
const viewProgess = require('../../progress/viewProgess');

let timeRef = 'h2';
let changeRef = 3;
let oldFound = [];
algo(function (perfByTime) {
    let found = [];
    let top = _.filter(perfByTime[timeRef], perf => perf.change > changeRef);
    _.forEach(top, perf => {
        let [h24, h12, h8, h6, h4, h2, h1, m30, m15, m5, m3, m2, m1] =
            ['h24', 'h12', 'h8', 'h6', 'h4', 'h2', 'h1', 'm30', 'm15', 'm5', 'm3', 'm2', 'm1'].map(t => getPerf(perf.symbol, t))
        if (_.min([h24, h12, h8, h6, h4, h2, h1, m30, m15, m5, m3, m2, m1]) > 0)
            if (_.min([h24, h12, h8, h6, h4, h2, h1, m30, m15, m5]) > 1)
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
