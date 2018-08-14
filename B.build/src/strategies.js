const { strategies } = require('common/settings');
const _ = require('lodash');

module.exports = _.mapValues(strategies, (strategyOptions, strat_name) =>
    new (require(`./${strat_name}.strategy`))(strategyOptions)
);