const _ = require('lodash');
const moment = require('moment-timezone');
const TIME_ZONE = 'Africa/Douala'
const sorted = require('is-sorted')
const { publish, subscribe } = require('common/redis');

// const algo = require('..');
const { getSymbolsChanges, getChangeFrom, changePercent, timeframeStartAt, DURATION, DEFAULT_PERIODS } = require('../../binance-utils');
// const prices = require('../../progress/prices');
console.log.throttle = _.throttle(console.log, 1e3 * 60)
// let timeRef = 'day';
const strategyName = 'm24first_e_bis'

let in_;
let out;
let stop;
let last = null;
let first = null;
let second = null;
let m1first = null
let m2first = null
let m3first = null
let m1last = null
let m2last = null
let m3last = null
let log = []
const gainLogs = {}
const FAST_GROW = 2
const STOP_LOSS = -2
let algoStarted;
let screener = {};
const TARGET_GAIN = 1.2
const MAX_SPREAD = .6
const SATOSHI = 1e-8
let gain = 0
let sellReason;
const tme_message_ids = {}
const processStartTime = Date.now()
let startTime
const SELL_REASON = {
    STOP_LOSS: 'stop_loss',
    SWITCH_TO_FIRST: 'switch_to_first',
    DROPPING: 'dropping',
}

const orderScreener = (screener) => _.orderBy(screener, perf => perf ? perf.change : 0, 'desc')
const getFirst = (screener) => _.first(orderScreener(screener))


init()

function getIn_ForSymbol(symbol) {
    return _.maxBy(_.filter(log, { symbol }).concat({ in_ }), 'in_').in_
}

function run(screener) {
    first = getFirst(screener)
    if (first) {
        logFirst()
        if (!last) {
            first.in_ = getIn_ForSymbol(first.symbol)
            if (first.change > first.in_) {
                first.out = first.in_ - stop
                buy()
            }
        } else {
            Object.assign(last, screener[last.symbol])
            calculateGain()
            // collectProfit()
            // tryRestart()
            if (last)
                if (last.change > last.out && last.symbol === first.symbol) {
                    last.in_ = _.max([last.in_, last.change]);
                    last.out = last.in_ - stop
                } else if (
                    (last.gain <= last.out && (sellReason = SELL_REASON.STOP_LOSS))
                    || (first.change - last.change > 2 && (sellReason = SELL_REASON.SWITCH_TO_FIRST))
                // || (last.gain < 0 && last.symbol !== first.symbol && (sellReason = "#Lossing_switch_to_first"))
                ) {
                    last.in_ = last.change;
                    last.out = last.in_ - stop
                    // resetInOut()
                    sell(sellReason)
                } else if ((_.max([m1last.change, m2last.change, m3last.change]) < 0 && (sellReason = SELL_REASON.DROPPING))) {
                    last.in_ = last.change + 1;
                    last.out = last.in_ - stop
                    // resetInOut()
                    sell(sellReason)
                }
        }
    }
}

function init() {
    last = null;
    stop = 3
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

        const time = moment(new Date(startTime)).tz(TIME_ZONE).format('HH:mm - DD MMM')
        console.log('startTime', time)
        const text = `#newframe started at ${time}`
        publish(`m24:algo:tracking`, {
            strategyName,
            text
        });
        console.log(text)
    }
    return startTime
}

function buyCondition() {
    const changes = [m1first.change, m2first.change/*, m3first.change*/]
    if (_.min(changes) > 0) {
        if (true || sorted(changes)) {
            if (true || (first.change - _.max(changes)) > 1) {
                return true
            }
        }
    }
}

function buy() {
    if (buyCondition()) {
        last = first;
        log.push(last);
        last.openPrice = last.close;
        last.startTime = Date.now()
        const text = `#${log.length}buy #buy #buy_${last.symbol} ${last.symbol} at ${last.close} [${last.change.toFixed(2)}%]`
        publish(`m24:algo:tracking`, {
            strategyName,
            text
        });
        console.log(text)
    }
}

function sell(sellReason) {
    last.closePercent = last.change
    last.endTime = Date.now()
    calculateGain()
    gain += last.gain
    gainLogs[last.symbol] = (gainLogs[last.symbol] || 0) + last.gain

    logSell(sellReason)
    // in_ += .3
    last = null;
    // if (sellReason === SELL_REASON.STOP_LOSS) {
    //     init()
    // }
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
        [${last.change.toFixed(2)}%] [next buy at ${last.in_.toFixed(2)}%]`;

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
        const text = `#${log.length}gain 
         ${last.symbol}  ${last.gain.toFixed(2)}% 
         Max gain ${last.maxGain.toFixed(2)}%
         All time gain ${gain.toFixed(2)}%
         -----------------------------------
         stop ${last.out.toFixed(2)}%
         from ${moment(last.startTime).fromNow()}
         _____________________________________
         first ${first.symbol} ${first.change.toFixed(2)}%
         second ${second.symbol} ${second.change.toFixed(2)}%
         diff ${(first.change - second.change).toFixed(2)}%
         -----------------------------------
         ${[m1last.change, m2last.change, m3last.change].map((change,i)=>`m${i+1} ${change.toFixed(2)}%`).join(' - ')}
         `
        const id = 'trk' + log.length
        publish(`m24:algo:tracking`, {
            id,
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
    logFirst.first_change = logFirst.first_change || 0
    if (first) {
        if (first.change.toFixed(1) != logFirst.first_change.toFixed(1)) {
            let text = `first ${first.symbol} ${first.change.toFixed(2)}%
second ${second.symbol} ${second.change.toFixed(2)}%
diff ${(first.change - second.change).toFixed(2)}%
from ${moment(startTime).fromNow()}
[next buy at ${getIn_ForSymbol(first.symbol).toFixed(2)}%]
`

            let id = strategyName + 'first' + log.length
            publish(`m24:algo:tracking`, {
                id,
                message_id: tme_message_ids[id],
                strategyName,
                text
            });
            console.log(text)
            logFirst.first_change = first.change
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
                startTime += DURATION.MIN_5
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
            }));
            last && ([m1last, m2last, m3last] = ['m1', 'm2', 'm3',].map(period => getChangeFrom({
                candles: allSymbolsCandles[last.symbol],
                symbol: last.symbol,
                period: DEFAULT_PERIODS[period]
            })))

            run(screener)
        }

    }
}

subscribe('tme_message_id', ({ id, message_id }) => {
    id && (tme_message_ids[id] = message_id)
})