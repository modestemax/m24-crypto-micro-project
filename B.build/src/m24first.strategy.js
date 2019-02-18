const debug = require('debug')('B:strategy:bbema150-15M');

const M24Base = require('./m24Base');
const _ = require('lodash');
const { publish, subscribe, redisSet, redisGet } = require('common/redis');
const { candleUtils, saveDatum, exchange, humanizeDuration } = require('common');
const { computeChange, valuePercent } = candleUtils;

const redisSetThrottle = _.throttle(redisSet, 1e3 * 2);

module.exports = class extends M24Base {
    constructor(...args) {
        super(...args);
    }


    async canBuy({ symbolId, timeframe }, _last, _prev, signal) {
        let current = signal.candle;
        if (current.position_good_spread == 1) {
            first = current;
            if (in_ > first.change_to_high) {
                last && sell()
                init()
            }
        }
        if (first)
            if (!last) {
                if (first.change_from_open > in_) {
                    last = first;
                    buy()
                }
            } else {
                if (last.symbolId === current.symbolId) Object.assign(last, current)
                if (last.change_from_open > out && last.symbolId === first.symbolId) {
                    in_ = _.max([in_, last.change_from_open]);
                    out = in_ - stop
                } else {
                    sell()
                    last = null;
                }
            }
    }
};

let in_;
let out;
let stop;
let last = null;

let first = null;
let log = []
init()

function init() {
    last = null;
    stop = 2
    in_ = 5
    out = in_ - stop
}

function buy() {
    log.push(last);
    last.openPercent = last.change_from_open;
    publish(`m24:algo:tracking`, {
        strategyName: 'm24first',
        text: `#${log.length}buy ${last.symbolId} at ${last.close} [${last.change_from_open.toFixed(2)}%]`
    });

}

function sell() {
    last.closePercent = last.change_from_open
    last.gain = last.closePercent - last.openPercent
    publish(`m24:algo:tracking`, {
        strategyName: 'm24first',
        text: `#${log.length}sell  ${last.symbolId} at ${last.close} gain ${last.gain.toFixed(2)}% 
        [${last.change_from_open.toFixed(2)}%] [next buy at ${in_.toFixed(2)}%]`
    });

}