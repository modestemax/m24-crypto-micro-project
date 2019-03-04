const prices = require('../progress/prices');
const { publish, subscribe } = require('common/redis');
const _ = require('lodash');
const moment = require('moment-timezone');
const TIME_ZONE = 'Africa/Douala'
const trades = {};
const ONE_MIN = 1e3 * 60
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
        let text = `pair found ${strategy} ${symbol}`
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
        if (trade.change < -5) delete trade[symbol][trade.id]
        else {
            if (trade.change.toFixed(1) !== trade.oldChange.toFixed(1)) {
                let text = `
#${moment().tz(TIME_ZONE).format('DDMMM')}
#${trade.strategy} #${trade.strategy}_${trade.symbol}
change ${trade.change.toFixed(2)}%
max ${changePercent(trade.open, trade.high).toFixed(2)}%
min ${changePercent(trade.open, trade.low).toFixed(2)}%
duration  ${moment(trade.time).fromNow()} [${moment().tz(TIME_ZONE).format('H:mm')}]
state #${trade.high >= 1 ? 'win' : 'lost'}
open ${trade.open}
close ${trade.close}
`
                tme_message_ids[trade.id] && publish(`m24:algo:simulate`, {
                    id: trade.id,
                    message_id: tme_message_ids[trade.id],
                    text
                });
                console.log(text)
            }
        }


    })
})


subscribe('tme_message_id', ({ id, message_id }) => {
        id && (tme_message_ids[id] = message_id)
    }
)