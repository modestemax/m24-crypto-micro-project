const _ = require('lodash');
const moment = require('moment-timezone');
const TIME_ZONE = 'Africa/Douala'
const sorted = require('is-sorted')
const { publish, subscribe } = require('common/redis');

// const algo = require('..');
const { getSymbolsChanges, getChangeFrom, getPeriodsChanges, changePercent, timeframeStartAt, DURATION, DEFAULT_PERIODS } = require('../../binance-utils');
// const prices = require('../../progress/prices');
console.log.throttle = _.throttle(console.log, 1e3 * 60)
// let timeRef = 'day';
const strategyName = 'm24first_f'

let in_;
let out;
let stop;
let last = null;
let lastInOtherPeriods = null;
let first = null;
let firstInOtherPeriods = null;
let second = null;
let secondInOtherPeriods = null;
let log = []
const gainLogs = {}
const STOP_LOSS = -2
let algoStarted;
let screener = {};
const TARGET_GAIN = 1.2
let sellReason;
const tme_message_ids = {}
const processStartTime = Date.now()
let startTime
const SELL_REASON = {
    STOP_LOSS: 'stop_loss',
    SWITCH_TO_FIRST: 'switch_to_first',
    DROPPING: 'dropping',
    TARGET: 'target',
}

const orderScreener = (screener) => _.orderBy(screener, perf => perf ? perf.change : 0, 'desc')
const getFirst = (screener) => _.first(orderScreener(screener))


init()


function run(screener) {
    first = getFirst(screener)
    if (first) {
        logFirst()
        buy()
        if (last) {
            Object.assign(last, screener[last.symbol])
            calculateGain()
            // collectProfit()
            // tryRestart()


            // if (last)
            //     if (last.change > last.out && last.symbol === first.symbol) {
            //         last.in_ = _.max([last.in_, last.change]);
            //         last.out = last.in_ - stop
            //     } else if (
            //         (last.gain <= last.out && (sellReason = SELL_REASON.STOP_LOSS))
            //         || (first.change - last.change > 2 && (sellReason = SELL_REASON.SWITCH_TO_FIRST))
            //     // || (last.gain < 0 && last.symbol !== first.symbol && (sellReason = "#Lossing_switch_to_first"))
            //     ) {
            //         last.in_ = last.change;
            //         last.out = last.in_ - stop
            //         // resetInOut()
            //         sell(sellReason)
            //     } else if ((_.max([lastInOtherPeriods.m1.change, lastInOtherPeriods.m2.change, lastInOtherPeriods.m3.change]) < 0 && (sellReason = SELL_REASON.DROPPING))) {
            //         last.in_ = last.change + 1;
            //         last.out = last.in_ - stop
            //         // resetInOut()
            //         sell(sellReason)
            //     } else if (last.gain > 1) {
            //         sell(SELL_REASON.TARGET)
            //         algoStarted = false;
            //         startTime = null
            //     }
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
    in_ = 10
    out = in_ - stop
}

function getStartTime() {
    if (!startTime) {
        const now = Date.now() - DURATION.HOUR_4;
        startTime = now - now % DURATION.MIN_1

        const time = moment(new Date(startTime)).tz(TIME_ZONE).format('HH:mm - DD MMM')
        console.log('startTime', time)
        const text = `#newframe started at ${time}`
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
    const changes = [firstInOtherPeriods.m1.change, firstInOtherPeriods.m2.change/*, m3first.change*/]
    if (_.min(changes) > 0) {
        if (true || sorted(changes)) {
            if (true || (first.change - _.max(changes)) > 1) {
                return true
            }
        }
    }
}

function buy() {
    function getBuyCandle(symbol) {
        return buy.candle && buy.candle.symbol === symbol && buy.candle
    }

    function setBuyCandle(buyCandle) {
        buy.candle = buyCandle
    }

    // if (true || buyCondition()) {
    if (!last || last.symbol !== first.symbol) {
        let buyCandle = getBuyCandle(first.symbol)
        if (!buyCandle) {
            buyCandle = {
                symbol: first.symbol,
                open: first.close,
                close: first.close,
                high: first.close,
                low: first.close,
            }
            setBuyCandle(buyCandle)
        } else if (!buyCandle.buy) {
            buyCandle.close = first.close
            buyCandle.high = _.max([buyCandle.high, buyCandle.close])
            buyCandle.low = _.min([buyCandle.low, buyCandle.close])
            if (changePercent(buyCandle.close, buyCandle.high) > 3) {
                //stop loss atteint
                buyCandle = {
                    buy: true,
                    symbol: first.symbol,
                    open: first.close,
                    close: first.close,
                    high: first.close,
                    low: first.close,
                }
                setBuyCandle(buyCandle)
            }
        } else {
            buyCandle.close = first.close
            if (changePercent(buyCandle.open, buyCandle.close) > 1) {
                last && sell(SELL_REASON.SWITCH_TO_FIRST)
                last = first;
                log.push(last);
                last.openPrice = last.close;
                last.startTime = Date.now()
                const text = `#${log.length}buy #buy #buy_${last.symbol} ${last.symbol} at ${last.close} [${last.change.toFixed(2)}%]`
                publish(`m24:algo:tracking`, {
                    max: true,
                    strategyName,
                    text
                });
                console.log(text)
                //-----------------------
                publish(`m24:simulate`, {
                    strategy: strategyName,
                    symbol: first.symbol,
                    open: +first.close
                });
            }
        }


    }
}

function sell(sellReason) {
    last.closePercent = last.change
    last.endTime = Date.now()
    calculateGain()

    gainLogs[last.symbol] = (gainLogs[last.symbol] || 0) + last.gain

    logSell(sellReason)
    // in_ += .3
    last = null;
    // if (sellReason === SELL_REASON.STOP_LOSS) {
    //     init()
    // }
}

function logSell(sellReason) {
    let gain = _.sumBy(log, 'gain');
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
        max:true,
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
-------
trade duration ${moment(last.startTime).fromNow()}
______
first ${first.symbol} ${first.change.toFixed(2)}%
second ${second.symbol} ${second.change.toFixed(2)}%
diff ${(first.change - second.change).toFixed(2)}%
--------\n
${[/*m1last.change, m2last.change, m3last.change*/].map((change, i) => `m${i + 1}:${change.toFixed(2)}%`).join('\n')}
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
    logFirst.first_change = logFirst.first_change || 0
    if (first) {
        if (first.change.toFixed(1) != logFirst.first_change.toFixed(1)) {
            let text = `first ${first.symbol} ${first.change.toFixed(2)}%
second ${second.symbol} ${second.change.toFixed(2)}%
diff ${(first.change - second.change).toFixed(2)}%
from ${moment(startTime).fromNow()}
`

            let id = strategyName + 'first' + log.length
            publish(`m24:algo:tracking`, {
                id,
                max: true,
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
            max: true,
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

        let count = _.values(screener).filter(v => v).length
        logLoading(count, symbols)


        first && (firstInOtherPeriods = getPeriodsChanges({
            candles: allSymbolsCandles[first.symbol],
            symbol: first.symbol,
            periods: DEFAULT_PERIODS
        }))
        second && (secondInOtherPeriods = getPeriodsChanges({
            candles: allSymbolsCandles[second.symbol],
            symbol: second.symbol,
            periods: DEFAULT_PERIODS
        }))
        last && (lastInOtherPeriods = getPeriodsChanges({
            candles: allSymbolsCandles[last.symbol],
            symbol: last.symbol,
            periods: DEFAULT_PERIODS
        }))

        run(screener)
    }

}

subscribe('tme_message_id', ({ id, message_id }) => {
        id && (tme_message_ids[id] = message_id)
    }
)