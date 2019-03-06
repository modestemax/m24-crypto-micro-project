const { publish, subscribe } = require('common/redis');
const _ = require('lodash');
const moment = require('moment-timezone');
const TIME_ZONE = 'Africa/Douala'
const trades = {};
const ONE_MIN = 1e3 * 60
const TARGET = 2
const LOSS = -5
const change = (open, close) => (close - open) / open;
const changePercent = (open, close) => change(open, close) * 100;
const tme_message_ids = {}

function getId(strategy, symbol) {
    let id = strategy + symbol
    let trade = trades[symbol][id]
    if (trade && (trade.win || trade.lost)) {
        delete tme_message_ids[id]
        delete trades[symbol][id]
    }
    return id;
}

subscribe('m24:simulate', ({ symbol, strategy, open, stop, limit }) => {
    trades[symbol] = trades[symbol] || {}
    let id = getId(strategy, symbol)
    if (!trades[symbol][id]) {
        let text = `pair found ${strategy} ${symbol} ${open ? open : ''} 
        ${stop ? `stop ${stop.toFixed(8)}` : ''} 
        ${limit ? `limit ${limit.toFixed(8)}` : ''}`
        publish(`m24:algo:simulate`, { id, text });
        console.log(text)
        trades[symbol][id] = { id, open, stop, limit, symbol, strategy, time: Date.now() }
    }
})

subscribe('price', ({ symbol, close }) => {
    _.values(trades[symbol]).forEach((trade) => {
        if (!trade.open) {
            if (trade.stop) {
                if (Math.abs(changePercent(trade.stop, close)) < .3) {
                    trade.stop = null
                }
            } else if (trade.limit) {
                if (Math.abs(changePercent(trade.limit, close)) < .3) {
                    trade.limit = null
                    trade.open = close
                    trade.time = Date.now()
                }
            }
            let { strategy, open, stop, limit, id } = trade
            let text = `pair found ${strategy} ${symbol} ${open ? open : ''} 
${`close ${stop.toFixed(8)}`} 
${stop ? `stop ${stop.toFixed(8)}` : ''} 
${limit ? `limit ${limit.toFixed(8)}` : ''}`

            tme_message_ids[id] && publish(`m24:algo:simulate`, {
                id, text, message_id: tme_message_ids[id],
            });
            console.log(text)
            return
        }
        trade.open = trade.open || close
        trade.close = close
        trade.high = _.max([trade.high, close])
        trade.low = _.min([trade.low, close])
        trade.oldChange = isNaN(trade.change) ? -Infinity : trade.change
        trade.change = changePercent(trade.open, trade.close)
        // let lost;
        // if (trade.change < -5) lost = delete trade[symbol][trade.id]

        if (trade.change.toFixed(1) !== trade.oldChange.toFixed(1)) {
            let highChange = trade.highChange = changePercent(trade.open, trade.high)
            let lowChange = trade.lowChange = changePercent(trade.open, trade.low)

            const lost = trade.lost = lowChange <= LOSS
            const win = trade.win = highChange >= TARGET
            trade.timeEnd = trade.timeEnd || (win && Date.now()) || void 0
            trade.minEnd = trade.minEnd || (win && trade.low) || void 0
            let winDuration = win && moment.duration(moment(trade.timeEnd).diff(moment(trade.time))).humanize()
            let minEndChange = changePercent(trade.open, trade.minEnd)
            let state = win ? `win [${winDuration}] [${minEndChange.toFixed(2)}%]` : 'lost'
            let state2 = win ? `win` : 'lost'

            let date = moment().tz(TIME_ZONE)
            // let quarter = Math.trunc(date.hour() / 6) + 1
            let quarter = Math.trunc(date.format('H') / 6) + 1
            let day = `${date.format('DDMMM')}`
            let dayCode = `${day}_${quarter}`
            let text = `
#${day} #${dayCode}
#${trade.strategy} #${trade.strategy}_${trade.symbol}
change ${trade.change.toFixed(2)}%
max ${highChange.toFixed(2)}%
min ${lowChange.toFixed(2)}%
duration  ${moment(trade.time).fromNow()} [${moment(trade.time).tz(TIME_ZONE).format('H\\h:mm')}]
state #${state} #${state2}_${dayCode}
open ${trade.open}
close ${trade.close}
${win || lost ? '#closed' : ''}
`
            tme_message_ids[trade.id] && publish(`m24:algo:simulate`, {
                id: trade.id,
                message_id: tme_message_ids[trade.id],
                text
            });
            console.log(text)
        }


    })
})


subscribe('tme_message_id', ({ id, message_id }) => {
        id && (tme_message_ids[id] = message_id)
    }
)