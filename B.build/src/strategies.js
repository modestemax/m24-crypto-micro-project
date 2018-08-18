const { strategies } = require('common/settings');
const _ = require('lodash');

module.exports = _.mapValues(strategies, (strategyOptions, name) =>
    new (require(`./${name}.strategy`))(Object.assign({ name }, strategyOptions))
);