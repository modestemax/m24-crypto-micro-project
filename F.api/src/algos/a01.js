const _ = require('lodash');
const algo = require('./index');
let top0;
// const times = ['m5', 'm15', 'm30', 'h1', 'h2', 'h4', 'h6', 'h8', 'h12', 'h24'];
algo(function (perfByTime) {
    // debugger
    const top5 = _.reduce(perfByTime, (top, perfs, time) => {
        top[time] = _.slice(perfs, 0, 5 + 1);
        // console.log(time,top[time].map(t=>t.symbol).join(' '))
        return top;
    }, {});
    // debugger;
    // let top = _.intersectionBy(_.values(top5), 'symbol')[0];
    let top = _.intersection(..._.values(top5).map(t => t.map(t => t.symbol)))
    let newsInTop = _.differenceBy(top, top0, 'symbol');
    if (!top0 || newsInTop.length) {
        console.log(newsInTop.map(t => t.symbol).join(' '))
        top0 = top;
    }
});