const _ = require('lodash');

const algo = require('..');

let timeRef = 'm1';
let changeRef = 1;

algo(function ({ perfByTime, getPerf, trade, prices, quantities }) {
    // trade({ symbol:'', price:'', quantity :''})

    let top = _.filter(perfByTime[timeRef], perf => perf.change > changeRef);
    _.forEach(top, perf => {
        const price = +prices[perf.symbol];
        const symbol = perf.symbol;
        const [m3, m2, m1] = ['m3', 'm2', 'm1'].map(t => getPerf(perf.symbol, t))
        if (_.min([m3, m2, m1]) > 1)
            if (_.min([m3, m2]) > 2)
                if (m3 > m2)
                    if (_.max([m3, m2, m1]) < 3)
                        trade({
                            percentageExpected:1,
                            symbol, price,
                            // quantity: +quantities['BTC'].available / price
                            quantity: 0.001 / price,
                            maxWaitBuyTime: 5e3
                        })
    });

});
