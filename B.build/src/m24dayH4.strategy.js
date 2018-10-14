const debug = require('debug')('B:strategy:bbema150-15M');

const M24day = require('./m24day.strategy');
const _ = require('lodash');
const { publish, subscribe, redisSet, redisGet } = require('common/redis');
const { candleUtils, saveDatum, exchange, humanizeDuration } = require("common");
const { computeChange, valuePercent } = candleUtils;

module.exports = class extends M24day {

};

