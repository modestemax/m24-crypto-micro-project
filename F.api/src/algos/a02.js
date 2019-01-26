const _ = require('lodash');

const algo = require('./index');
const prices = require('../progress/prices');
const viewProgess = require('../progress/viewProgess');

let timeRef = 'h2';
let changeRef = 3;
// const times = ['m5', 'm15', 'm30', 'h1', 'h2', 'h4', 'h6', 'h8', 'h12', 'h24'];
algo(function (perfByTime) {
    // debugger
    let found = [];
    let top = _.filter(perfByTime[timeRef], perf => perf.change > changeRef);
    _.forEach(top, perf => {
        if (getPerf(perf.symbol, 'h1') > 1)
            if (getPerf(perf.symbol, 'm15') > 1)
                if (getPerf(perf.symbol, 'm30') > 1)
                    if (getPerf(perf.symbol, 'm5') > 1)
                        if (getPerf(perf.symbol, 'm5') < 2)
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
