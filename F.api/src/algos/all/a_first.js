const _ = require('lodash');
const { publish, subscribe } = require('common/redis');

// const algo = require('..');
const { getSymbolsChanges, getChangeFrom, changePercent, timeframeStartAt, DURATION } = require('../../binance-utils');
const prices = require('../../progress/prices');
console.log.throttle = _.throttle(console.log, 1e3 * 60)
let timeRef = 'day';

let in_;
let out;
let stop;
let last = null;

let first = null;
let log = []
const FAST_GROW = 2
const STOP_LOSS = -2

const getFirst = (perfByTime) => _.first(_.orderBy(perfByTime, perf => perf && perf.change, 'desc'))


init()

function run(allGoodSymbolsCandles) {
    const period = getStartTime
    const screener = getSymbolsChanges({
        allSymbolsCandles: allGoodSymbolsCandles,
        period
    })
    first = getFirst(screener)
        logFirst()
        if (!last) {
            if (first.change > in_) {
                buy()
            }
        } else {
        Object.assign(last, getChangeFrom({
            candles: allGoodSymbolsCandles[last.symbol],
            period, symbol: last.symbol
        }))
            calculateGain()
            tryRestart()
            if (last)
                if (last.gain > STOP_LOSS && last.symbol === first.symbol) {
                    in_ = _.max([in_, last.change]);
                    out = in_ - 2
                } else if (!(last.gain > STOP_LOSS) || first.change - last.change > 1) {
                    sell()
                }
    }
}

function init() {
    last = null;
    stop = 4
    in_ = 3
    out = in_ - stop
}

const processStartTime = Date.now()
let startTime

function getStartTime() {
    if (!startTime) {
        const now = Date.now() - DURATION.HOUR_1;
        startTime = now - now % DURATION.MIN_1

        // startTime =  timeframeStartAt(DURATION.HOUR_1)()
    }
    return startTime
}

function buy() {
    last = first;
    log.push(last);
    last.openPercent = last.change;
    const text = `#${log.length}buy ${last.symbol} at ${last.close} [${last.change.toFixed(2)}%]`
    publish(`m24:algo:tracking`, {
        strategyName: 'm24first',
        text
    });
    console.log(text)
}

function sell() {
    last.closePercent = last.change
    calculateGain()
    const text = `#${log.length}sell  ${last.symbol} at ${last.close}
         gain ${last.gain.toFixed(2)}% 
         Max gain ${last.maxGain.toFixed(2)}% 
        [${last.change.toFixed(2)}%] [next buy at ${in_.toFixed(2)}%]`;

    publish(`m24:algo:tracking`, {
        strategyName: 'm24first',
        text
    });
    console.log(text)
    last = null;
}

let gain = 0

function calculateGain() {
    last.prevGain = last.gain || 0
    last.gain = last.change - last.openPercent
    gain += last.gain
    last.maxGain = _.max([last.gain, last.maxGain])
    if (last.prevGain.toFixed(1) != last.gain.toFixed(1)) {
        const text = `#${log.length}gain  ${last.symbol}  ${last.gain.toFixed(2)}% 
         Max gain ${last.maxGain.toFixed(2)}%
         All time gain ${gain.toFixed(2)}%`
        publish(`m24:algo:tracking`, {
            strategyName: 'm24first',
            text
        });
    }
}

function tryRestart() {
    if (Date.now() - startTime > DURATION.HOUR_6 || last.gain > TARGET_GAIN) {
        sell()
        startTime = null
        const text = `restart     `
        publish(`m24:algo:tracking`, {
            strategyName: 'm24first',
            text
        });
        console.log(text)
    }
}

let first_change = 0;

function logFirst() {
    if (first) {
        if (first.change.toFixed(1) != first_change.toFixed(1)) {
            console.log(`first ${first.symbol} ${first.change.toFixed(2)}%`)
            first_change = first.change
        }
    }
}

const TARGET_GAIN = 5
const MAX_SPREAD = .6
const SATOSHI = 1e-8
console.log('listen to ALL_SYMBOLS_CANDLES')
subscribe('ALL_SYMBOLS_CANDLES', allSymbolsCandles => {
    if (Object.keys(prices).length > 10) {
        console.log.throttle(_.uniqueId("i'm alive since " + new Date(startTime).toTimeString()))
        const allGoodSymbolsCandles = _.reduce(allSymbolsCandles, (allGoodSymbolsCandles, candles, symbol) => {
            if (changePercent(prices[symbol], prices[symbol] + SATOSHI) < MAX_SPREAD) {
                allGoodSymbolsCandles[symbol] = candles
            }
            return allGoodSymbolsCandles
        }, {})
        run(allGoodSymbolsCandles)
    } else {
        console.log('symbols count', Object.keys(prices).length)
    }
});
