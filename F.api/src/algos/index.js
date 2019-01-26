const { subscribe } = require('common/redis');
const _ = require('lodash');
let perfByTime;
const algos = [];
let perfChanged = (perfByTime) => algos.forEach(algo => algo(perfByTime));

subscribe('prevPerf', perfs => {
    // debugger;
    perfByTime = _(perfs).reduce((perfByTime, perf) => {
        _.forEach(perf, (perf, time) => {
            perfByTime[time] = (perfByTime[time] || []).concat(perf)
        });
        return perfByTime;
    }, {});
    perfByTime = _.mapValues(perfByTime, perfs => _.orderBy(perfs, 'change', 'desc'));
    perfChanged(perfByTime);
    // debugger
});

module.exports = function (algo) {
    !algos.includes(algo) && algos.push(algo)
};
