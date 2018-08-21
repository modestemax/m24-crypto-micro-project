const { getOpenOrders, getTrades } = require('./market');
const _ = require('lodash');
const { publish } = require('common/redis');

(async () => {
  try {
    //-----PENDING ORDERS
    const orders = await getOpenOrders();
    _.forEach(orders, order => {
      publish('asset:tryToBuy', order)
    })

    //-----RUNNING TRADES
    const trades = await getTrades()
    _.forEach(trades, trade => {
      publish('asset:track', trade)
    })

  } catch (err) {
    debugger
  }
})()