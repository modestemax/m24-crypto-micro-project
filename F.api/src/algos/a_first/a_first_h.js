const _ = require('lodash');
const sorted = require('is-sorted')
const { publish, subscribe } = require('common/redis');

// const algo = require('..');
const { getSymbolsChanges, getChangeFrom, changePercent, timeframeStartAt, DURATION, DEFAULT_PERIODS } = require('../../binance-utils');
// const prices = require('../../progress/prices');
console.log.throttle = _.throttle(console.log, 1e3 * 60)
// let timeRef = 'day';
const strategyName = 'm24first_h'

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
const MAX_SPREAD = .6
const SATOSHI = 1e-8
let first_change = 0;
let sellReason;
const tme_message_ids = {}
const processStartTime = Date.now()
let startTime
const SELL_REASON = {
    STOP_LOSS: 'stop_loss',
    SWITCH_TO_FIRST: 'switch_to_first'
}

const orderScreener = (screener) => _.orderBy(screener, perf => perf ? perf.change : 0, 'desc')
const getFirst = (screener) => _.first(orderScreener(screener))


init()

function run(screener) {
    first = getFirst(screener)
    if (first) {
        logFirst()
        if (!last) {
            buy()
        } else {
            Object.assign(last, screener[last.symbol])
            calculateGain()
            // collectProfit()
            // tryRestart()
            if (last)
                if (last.symbol !== first.symbol && (sellReason = SELL_REASON.SWITCH_TO_FIRST)) {
                    sell(sellReason)
                } else if (last.gain > 5) {
                    publish(`m24:simulate`, {
                        strategy: strategyName,
                        symbol: last.symbol,
                        open: last.close
                    });
                }


        }
    }
}

function init() {
    last = null;
    stop = 2
    resetInOut()
    startTime = null
    algoStarted = false
}

function resetInOut() {
    in_ = 15
    out = in_ - stop
}

function getStartTime() {
    if (!startTime) {
        const now = Date.now() - DURATION.HOUR_6;
        startTime = now - now % DURATION.MIN_1
        console.log('startTime', new Date(startTime))
        // startTime =  timeframeStartAt(DURATION.HOUR_1)()

        const text = `#newframe started at ${new Date(startTime)}`
        publish(`m24:algo:tracking`, {
            max: true,
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
        log.push(last);
        last.openPrice = last.close;
        const text = `#${log.length}buy #buy #buy_${last.symbol} ${last.symbol} at ${last.close} [${last.change.toFixed(2)}%]`
        publish(`m24:algo:tracking`, {
            max: true,
            strategyName,
            text
        });
        console.log(text)
    }
}

function sell(sellReason) {
    last.closePercent = last.change
    calculateGain()

    logSell(sellReason)
    in_ += .3
    last = null;
    // if (sellReason === SELL_REASON.STOP_LOSS) {
    //     init()
    // }
}

function logSell(sellReason) {

    const text = `#${log.length}sell #sell #sell_${last.symbol} #${last.symbol} at ${last.close}
         sell reason #${sellReason || '#sell_reason_unknow'}   
         gain ${last.gain.toFixed(2)}%  #${last.gain > 0 ? 'win' : 'lost'}
         Max gain ${last.maxGain.toFixed(2)}% 
        [${last.change.toFixed(2)}%] [next buy at ${in_.toFixed(2)}%]`;

    publish(`m24:algo:tracking`, {
        max: true,
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
        const text = `#${log.length}gain 
         ${last.symbol}  ${last.gain.toFixed(2)}% 
         Max gain ${last.maxGain.toFixed(2)}%
         All time gain ${gain.toFixed(2)}%
         -----------------------------------
         first ${first.symbol} ${first.change.toFixed(2)}%
         second ${second.symbol} ${second.change.toFixed(2)}%
         diff ${(first.change - second.change).toFixed(2)}%
         
         `
        const id = 'trk' + log.length
        publish(`m24:algo:tracking`, {
            id,
            max: true,
            message_id: tme_message_ids[id],
            strategyName,
            text
        });
        console.log(text)
    }
}

function tryRestart() {
    if ((Date.now() - startTime > DURATION.HOUR_6 && (sellReason = "#la_session_a_trop_durée"))) {
        sell(sellReason)
        init()
        const text = `restart   last gain ${last.gain}  `
        publish(`m24:algo:tracking`, {
            max: true,
            strategyName,
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
            let text = `first ${first.symbol} ${first.change.toFixed(2)}%
second ${second.symbol} ${second.change.toFixed(2)}%
diff ${(first.change - second.change).toFixed(2)}%`

            let id = strategyName + 'first'
            publish(`m24:algo:tracking`, {
                id,
                max: true,
                message_id: tme_message_ids[id],
                strategyName,
                text
            });
            console.log(text)
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


function logLoading(count, symbols) {
    if (logLoading.count !== count) {
        logLoading.count = count
        let id = strategyName + 'start'
        let text = `loading ${(count / symbols.length * 100).toFixed(2)}%`
        publish(`m24:algo:tracking`, {
            id,
            max:true,
            message_id: tme_message_ids[id],
            strategyName,
            text
        });
        console.log(text)
    }
}

module.exports = {
    priceChanged(symbol, symbols, allSymbolsCandles) {
        DEFAULT_PERIODS.ALGO = getStartTime
        screener = getSymbolsChanges({ allSymbolsCandles, period: getStartTime, timeframeName: 'algo' })
        const orderedScreener = orderScreener(screener)
        first = getFirst(screener)
        second = _.nth(orderedScreener, 1) || {}

        // init()
        // algoStarted=true
        if (!algoStarted) {
            if (!first) return
            let count = _.values(screener).filter(v => v).length
            logLoading(count, symbols)
            // if (first.change > in_ - Math.abs(-STOP_LOSS)) {
            if (first.change > out) {
                startTime += DURATION.MIN_15
                if (startTime > Date.now() - DURATION.MIN_15) {
                    startTime = timeframeStartAt(DURATION.MIN_1)()
                }
            } else {
                algoStarted = count === symbols.length
                algoStarted && console.log('algoStarted ')
            }
        } else {
            [m1first, m2first, m3first] = ['m1', 'm2', 'm3',].map(period => getChangeFrom({
                candles: allSymbolsCandles[first.symbol],
                symbol: first.symbol,
                period: DEFAULT_PERIODS[period]
            }))

            run(screener)
        }

    }
}

subscribe('tme_message_id', ({ id, message_id }) => {
    id && (tme_message_ids[id] = message_id)
})