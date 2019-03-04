const { publish, subscribe } = require('common/redis');
const _ = require('lodash');
const moment = require('moment-timezone');
const TIME_ZONE = 'Africa/Douala'
const trades = {};
const ONE_MIN = 1e3 * 60
const TARGET = 2
const change = (open, close) => (close - open) / open;
const changePercent = (open, close) => change(open, close) * 100;
const tme_message_ids = {}

function getId(strategy, symbol) {
    return strategy + symbol
}

subscribe('m24:simulate', ({ symbol, strategy, open }) => {
    trades[symbol] = trades[symbol] || {}
    let id = getId(strategy, symbol)
    if (!trades[symbol][id]) {
        let text = `pair found ${strategy} ${symbol} ${open}`
        publish(`m24:algo:simulate`, { id: id, text });
        console.log(text)
        trades[symbol][id] = { id, open, symbol, strategy, time: Date.now() }
    }
})

subscribe('price', ({ symbol, close }) => {
    _.values(trades[symbol]).forEach((trade) => {
        trade.open = trade.open || close
        trade.close = close
        trade.high = _.max([trade.high, close])
        trade.low = _.min([trade.low, close])
        trade.oldChange = isNaN(trade.change) ? -Infinity : trade.change
        trade.change = changePercent(trade.open, trade.close)
        let lost;
        if (trade.change < -5) lost = delete trade[symbol][trade.id]

        if (trade.change.toFixed(1) !== trade.oldChange.toFixed(1)) {
            let highChange = changePercent(trade.open, trade.high)
            let lowChange = changePercent(trade.open, trade.low)

            const win = highChange >= TARGET
            trade.timeEnd = trade.timeEnd || (win && Date.now()) || void 0
            trade.minEnd = trade.minEnd || (win && trade.low) || void 0
            let winDuration = win && moment.duration(moment(trade.timeEnd).diff(moment(trade.time))).humanize()

            let minEndChange = changePercent(trade.open, trade.minEnd)
            let date = moment().tz(TIME_ZONE)
            // let quarter = Math.trunc(date.hour() / 6) + 1
            let quarter = Math.trunc(date.format('h') / 6) + 1
            let text = `
#${date.format('DDMMM')} #${date.format('DDMMM')}_${quarter}
#${trade.strategy} #${trade.strategy}_${trade.symbol}
change ${trade.change.toFixed(2)}%
max ${highChange.toFixed(2)}%
min ${lowChange.toFixed(2)}%
duration  ${moment(trade.time).fromNow()} [${moment(trade.time).tz(TIME_ZONE).format('H\\h:mm')}]
state #${win ? `win [${winDuration}] [${minEndChange.toFixed(2)}%]` : 'lost'} 
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