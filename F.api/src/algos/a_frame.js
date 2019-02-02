const _ = require('lodash');

const algo = require('./index');
const prices = require('../progress/prices');
const viewProgess = require('../progress/viewProgess');

let timeRef = 'h8';
let changeRef = 5;
let cryptos;
algo(function (perfByTime) {
    let found = [];
    let perfs = _.mapKeys(perfByTime[timeRef], 'symbol');
    if (!cryptos) {
        cryptos = _.filter(perfByTime[timeRef], perf => perf.change < changeRef - 1);
        cryptos = _.mapKeys(cryptos, 'symbol')
    }
    _.forEach(perfs, perf => {
        if (cryptos[perf.symbol]) {
            if (perf.change > changeRef && !cryptos[perf.symbol].found) {
                cryptos[perf.symbol].found = true
                prices[perf.symbol] && found.push(perf.symbol)
            } else if (perf.change < changeRef && cryptos[perf.symbol].found) {
                cryptos[perf.symbol] = perf
            }
        } else {
            if (perf.change < changeRef - 1) {
                cryptos[perf.symbol] = perf
            }
        }
    });

    if (found.length) {
        console.log(found.map(symbol => `${symbol} ${prices[symbol]}`));
        found.forEach(symbol => viewProgess({ symbol, startAt: prices[symbol] }))
    }
});
