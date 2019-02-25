const _ = require('lodash');
const sorted = require('is-sorted')
const { publish, subscribe } = require('common/redis');

// const algo = require('..');
const { getSymbolsChanges, getChangeFrom, changePercent, timeframeStartAt, DURATION, DEFAULT_PERIODS } = require('../../binance-utils');
const prices = require('../../progress/prices');
console.log.throttle = _.throttle(console.log, 1e3 * 60)
const strategyName = 'm24first_d'


let timeRef = 'day';

let in_;
let out;
let stop;
let last = null;
let first = null;
let second = null;
let m1first = null
let m2first = null
let m3first = null
let log = []
const gainLogs = {}
const FAST_GROW = 2
const STOP_LOSS = -2
let algoStarted;
let screener = {};
const TARGET_GAIN = 1.2
const TARGET_GAIN_1 = 2
const MAX_SPREAD = .6
const SATOSHI = 1e-8
let first_change = 0;
let gain = 0

let sellReason;
const tme_message_ids = {}
const processStartTime = Date.now()
let startTime
const SELL_REASON = {
    STOP_LOSS: 'stop_loss',
    SWITCH_TO_FIRST: 'switch_to_first',
    TARGET: 'target',
}
const orderScreener = (screener) => _.orderBy(screener, perf => perf ? perf.change : 0, 'desc')
const getFirst = (screener) => _.first(orderScreener(screener))

init()

function run(changes) {
    if (!last && first.change > 1)
        if (_.min([changes.m1.change, changes.m2.change, changes.m3.change] > 1.5))
            if (_.min([changes.m5.change, changes.m15.change, changes.m30.change] > 2))
                if (_.min([changes.h1.change, changes.h2.change, changes.h4.change] > 2.5))
                    if (_.min([changes.h6.change, changes.h8.change, changes.h12.change] > 3))
                        if (_.min([changes.h24.change, changes.day.change] > 3.5))
                            buy()
    if (last) {
        calculateGain()
        collectProfit()
    }
}

function init() {
    last = null;
    gain = 0
    resetInOut()
    startTime = null
    algoStarted = false
}

function resetInOut() {
    in_ = 5
    out = in_ - stop
}

function getStartTime(now) {
    if (!startTime) {
        now = now || Date.now() //- DURATION.HOUR_2;
        startTime = now - now % DURATION.MIN_1
        // console.log('startTime', new Date(startTime))
        // startTime =  timeframeStartAt(DURATION.HOUR_1)()

        const text = `#newframe started at ${new Date(startTime)}`
        publish(`m24:algo:tracking`, {
            strategyName,
            text
        });
        console.log(text)
    }
    return startTime
}

function buyCondition() {
    const changes = [m1first.change, m2first.change, m3first.change]
    if (_.min(changes) > 0) {
        if (sorted(changes)) {
            if (first.change - _.max(changes) > 1) {
                return true
            }
        }
    }
}

function buy() {
    if (true || buyCondition()) {
        last = first;
        last.startTime = Date.now()
        log.push(last);
        last.openPrice = last.close;
        const text = `#${log.length}buy #buy #buy_${last.symbol} ${last.symbol} at ${last.close} [${last.change.toFixed(2)}%]`
        publish(`m24:algo:tracking`, {
            strategyName,
            text
        });
        console.log(text)
    }
}

function sell(sellReason) {
    last.closePrice = last.close
    calculateGain()
    gain += last.gain

    logSell(sellReason)
    // in_ += .3
    last = null;
    // if (sellReason === SELL_REASON.STOP_LOSS) {
    //     init()
    // }
}

function logSell(sellReason) {
    // let gainers = _.orderBy(Object.entries(gainLogs), gain => gain[1], 'desc');
    // let gainer = _.first(gainers)
    // let looser = _.last(gainers)

    const text = `#${log.length}sell #${strategyName}_sell #sell_${last.symbol} #${last.symbol} at ${last.close}
         sell reason #${sellReason || '#sell_reason_unknow'}   
         gain ${last.gain.toFixed(2)}%  #${last.gain > 0 ? 'win' : 'lost'}
         Max gain ${last.maxGain.toFixed(2)}% 
         All time gain ${allTimeGain().toFixed(2)}%\n`
        // gainer ${gainer[0]} ${gainer[1].toFixed(2)}%
        // looser ${looser[0]} ${looser[1].toFixed(2)}%
        // + `[${last.change.toFixed(2)}%]`


    publish(`m24:algo:tracking`, {
        strategyName,
        text
    });
    console.log(text)
}

function calculateGain() {
    last.prevGain = last.gain || 0
    last.gain = changePercent(last.openPrice, last.close)

    last.maxGain = _.max([last.gain, last.maxGain])
    if (last.prevGain.toFixed(1) != last.gain.toFixed(1)) {
        const text = `#${log.length}gain #${strategyName}gain  ${last.symbol}  ${last.gain.toFixed(2)}% 
         Max gain ${last.maxGain.toFixed(2)}%
         Potential gain ${potentialGain().toFixed(2)}%
         All time gain ${allTimeGain().toFixed(2)}%
         `
        const id = strategyName + 'trk' + log.length
        publish(`m24:algo:tracking`, {
            id,
            message_id: tme_message_ids[id],
            strategyName,
            text
        });
    }
}

function allTimeGain() {
    return _.sumBy(log, 'gain')
}

function potentialGain() {
    return gain + last.gain
}

function tryRestart() {
    if (potentialGain() > TARGET_GAIN) {
        sell(SELL_REASON.TARGET)
        init()
        const text = `#${strategyName}_Target_Rich gain ${allTimeGain().toFixed(2)}%  `
        publish(`m24:algo:tracking`, {
            strategyName,
            text
        });
        console.log(text)
    }
}

function tryChangeOrigin() {
    last.originChangedCountPrev = last.originChangedCount || 0
    last.originChangedCount = last.maxGain - last.maxGain % TARGET_GAIN_1

    if (last.originChangedCountPrev !== last.originChangedCount) {
        last.originChangedCountPrev = last.originChangedCount
        startTime = null
        getStartTime(last.startTime)
        const text = `#${strategyName}_Origin_Changed gain ${allTimeGain().toFixed(2)}% 
         from ${last.originChangedCountPrev} to ${last.originChangedCount}`
        publish(`m24:algo:tracking`, {
            strategyName,
            text
        });
        console.log(text)
    }
}

function collectProfit() {
    if ((last.gain > TARGET_GAIN && (sellReason = SELL_REASON.TARGET))) {
        sell(sellReason)
    }
}


function logFirst() {
    if (first) {
        if (first.change.toFixed(1) != first_change.toFixed(1)) {
            let text = `first ${first.symbol} ${first.change.toFixed(2)}%
second ${second.symbol} ${second.change.toFixed(2)}%
diff ${(first.change - second.change).toFixed(2)}%`

            let id = strategyName + 'first'
            publish(`m24:algo:tracking`, {
                id,
                message_id: tme_message_ids[id],
                strategyName,
                text
            });
            console.log(text)
            first_change = first.change
        }
    }
}

const logLoadingOnce = _.once(logLoading)

function logLoading(count, symbols) {
    let id = strategyName + 'start'
    publish(`m24:algo:tracking`, {
        id,
        message_id: tme_message_ids[id],
        strategyName,
        text: `loading ${(count / symbols.length * 100).toFixed(2)}%`
    });
}

// console.log('listen to ALL_SYMBOLS_CANDLES')
// subscribe('ALL_SYMBOLS_CANDLES', allSymbolsCandles => {
//     if (Object.keys(prices).length > 10) {
//         console.log.throttle(_.uniqueId("i'm alive since " + new Date(startTime).toTimeString()))
//         const allGoodSymbolsCandles = _.reduce(allSymbolsCandles, (allGoodSymbolsCandles, candles, symbol) => {
//             if (changePercent(prices[symbol], prices[symbol] + SATOSHI) < MAX_SPREAD) {
//                 allGoodSymbolsCandles[symbol] = candles
//             }
//             return allGoodSymbolsCandles
//         }, {})
//         run(allGoodSymbolsCandles)
//     } else {
//         console.log('symbols count', Object.keys(prices).length)
//     }
// });
module.exports = {
    priceChanged(symbol, symbols, allSymbolsCandles, perfs) {
        DEFAULT_PERIODS.ALGO = getStartTime
        first = getFirst(getSymbolsChanges({ allSymbolsCandles, period: DEFAULT_PERIODS.m1, timeframeName: 'algo' }))
        if (first.change > 1) {
            const changes = ['m2', 'm2', 'm3', 'm5', 'm15', 'm30', 'h1', 'h1', 'h2', 'h4', 'h6', 'h8', 'h12', 'h24', 'day']
                .reduce((changes, period) => {
                    return { ...changes, [period]: perfs[first.symbol] ? perfs[first.symbol][period] : {} }
                }, {})
            // m3first = getFirst(getSymbolsChanges({ allSymbolsCandles, period: DEFAULT_PERIODS.m3, timeframeName: 'algo' }))

            run(changes)

        }
    }
}

subscribe('tme_message_id', ({ id, message_id }) => {
    id && (tme_message_ids[id] = message_id)
})


publish(`m24:algo:tracking`, {
    strategyName,
    text: `${strategyName} loaded`
});

setInterval(() => delete tme_message_ids['first'], 1e3 * 60 * 20)