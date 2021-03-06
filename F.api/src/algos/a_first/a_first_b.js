const _ = require('lodash');
const sorted = require('is-sorted')
const { publish, subscribe } = require('common/redis');

// const algo = require('..');
const { getSymbolsChanges, getChangeFrom, changePercent, timeframeStartAt, DURATION, DEFAULT_PERIODS } = require('../../binance-utils');
const prices = require('../../progress/prices');
console.log.throttle = _.throttle(console.log, 1e3 * 60)
let timeRef = 'day';

let in_;
let out;
let stop;
let last = null;
let first = null;
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
    SWITCH_TO_FIRST: 'switch_to_first'
}
const getFirst = (perfByTime) => _.first(_.orderBy(perfByTime, perf => perf ? perf.change : 0, 'desc'))

init()

function run(screener) {

    first = getFirst(screener)
    if (first) {
        logFirst()
        if (!last) {
            if (first.change > in_) {
                buy()
            }
        } else {
            Object.assign(last, screener[last.symbol])
            calculateGain()
            collectProfit()
            tryRestart()
            if (last)
                if (last.gain > STOP_LOSS && last.symbol === first.symbol) {
                    in_ = _.max([in_, last.change]);
                    out = in_ - 2
                } else if (
                    (last.gain <= STOP_LOSS && (sellReason = SELL_REASON.STOP_LOSS))
                    || (first.change - last.change > 1 && (sellReason = SELL_REASON.SWITCH_TO_FIRST))
                // || (last.gain < 0 && last.symbol !== first.symbol && (sellReason = "#Lossing_switch_to_first"))
                ) {
                    resetInOut()
                    sell(sellReason)
                }
        }
    }
}

function init() {
    last = null;
    stop = 4
    resetInOut()
    startTime = null
    algoStarted = false
}

function resetInOut() {
    in_ = 3
    out = in_ - stop
}

function getStartTime() {
    if (!startTime) {
        const now = Date.now() - DURATION.HOUR_2;
        startTime = now - now % DURATION.MIN_1
        console.log('startTime', new Date(startTime))
        // startTime =  timeframeStartAt(DURATION.HOUR_1)()

        const text = `#newframe started at ${new Date(startTime)}`
        publish(`m24:algo:tracking`, {
            strategyName: 'm24first',
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
    if (buyCondition()) {
        last = first;
        log.push(last);
        last.openPercent = last.change;
        const text = `#${log.length}buy #buy #buy_${last.symbol} ${last.symbol} at ${last.close} [${last.change.toFixed(2)}%]`
        publish(`m24:algo:tracking`, {
            strategyName: 'm24first',
            text
        });
        console.log(text)
    }
}

function sell(sellReason) {
    last.closePercent = last.change
    calculateGain()
    gain += last.gain
    gainLogs[last.symbol] = (gainLogs[last.symbol] || 0) + last.gain

    logSell(sellReason)
    in_ += .3
    last = null;
    if (sellReason === SELL_REASON.STOP_LOSS) {
        init()
    }
}

function logSell(sellReason) {
    let gainners = _.orderBy(Object.entries(gainLogs), gain => gain[1], 'desc');
    let gainner = _.first(gainners)
    let looser = _.last(gainners)

    const text = `#${log.length}sell #sell #sell_${last.symbol} #${last.symbol} at ${last.close}
         sell reason #${sellReason || '#sell_reason_unknow'}   
         gain ${last.gain.toFixed(2)}%  #${last.gain > 0 ? 'win' : 'lost'}
         Max gain ${last.maxGain.toFixed(2)}% 
          All time gain ${gain.toFixed(2)}%
          gainner ${gainner[0]} ${gainner[1].toFixed(2)}%
          looser ${looser[0]} ${looser[1].toFixed(2)}%
        [${last.change.toFixed(2)}%] [next buy at ${in_.toFixed(2)}%]`;

    publish(`m24:algo:tracking`, {
        strategyName: 'm24first',
        text
    });
    console.log(text)
}

function calculateGain() {
    last.prevGain = last.gain || 0
    last.gain = last.change - last.openPercent

    last.maxGain = _.max([last.gain, last.maxGain])
    if (last.prevGain.toFixed(1) != last.gain.toFixed(1)) {
        const text = `#${log.length}gain  ${last.symbol}  ${last.gain.toFixed(2)}% 
         Max gain ${last.maxGain.toFixed(2)}%
         All time gain ${gain.toFixed(2)}%`
        const id = 'trk' + log.length
        publish(`m24:algo:tracking`, {
            id,
            message_id: tme_message_ids[id],
            strategyName: 'm24first',
            text
        });
    }
}

function tryRestart() {
    if ((Date.now() - startTime > DURATION.HOUR_6 && (sellReason = "#la_session_a_trop_durée"))) {
        sell(sellReason)
        init()
        const text = `restart   last gain ${last.gain}  `
        publish(`m24:algo:tracking`, {
            strategyName: 'm24first',
            text
        });
        console.log(text)
    }
}

function collectProfit() {
    if ((last.gain > TARGET_GAIN && (sellReason = "#target_atteint"))) {
        sell(sellReason)
    }
}

function logFirst() {
    if (first) {
        if (first.change.toFixed(1) != first_change.toFixed(1)) {
            console.log(`first ${first.symbol} ${first.change.toFixed(2)}%`)
            first_change = first.change
        }
    }
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
    priceChanged(symbol, symbols, allSymbolsCandles) {
        DEFAULT_PERIODS.ALGO = getStartTime
        screener = getSymbolsChanges({ allSymbolsCandles, period: getStartTime, timeframeName: 'algo' })
        m1first = getFirst(getSymbolsChanges({ allSymbolsCandles, period: DEFAULT_PERIODS.m1, timeframeName: 'algo' }))
        m2first = getFirst(getSymbolsChanges({ allSymbolsCandles, period: DEFAULT_PERIODS.m2, timeframeName: 'algo' }))
        m3first = getFirst(getSymbolsChanges({ allSymbolsCandles, period: DEFAULT_PERIODS.m3, timeframeName: 'algo' }))

        // init()
        // algoStarted=true
        if (!algoStarted) {
            first = getFirst(screener)
            if (!first) return
            // if (first.change > in_ - Math.abs(-STOP_LOSS)) {
            if (first.change > in_ ) {
                startTime += DURATION.MIN_15
                if (startTime > Date.now() - DURATION.MIN_15) {
                    startTime = timeframeStartAt(DURATION.MIN_1)()
                }
            } else {
                algoStarted = _.values(screener).filter(v => v).length === symbols.length
                algoStarted && console.log('algoStarted ')
            }
        } else {
            run(screener)
        }

    }
}

subscribe('tme_message_id', ({ id, message_id }) => {
    id && (tme_message_ids[id] = message_id)
})