const { strategies } = require('common/settings');
const _ = require('lodash');

let sClasses = _.mapValues(strategies, (strategyOptions, name) =>
    strategyOptions.virtual || new (require(`./${name}.strategy`))(Object.assign({ name }, strategyOptions))
);

for (let [key, val] of Object.entries(sClasses)) {
    if (+val) delete sClasses[key];
}
module.exports = sClasses;