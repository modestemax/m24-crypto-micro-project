const _ = require('lodash');
const { market, fetchBalance, getLastAsk } = require('common');
const { publish, subscribe } = require('common/redis');

const { getOpenOrders, getTrades } = market;
const { estimatedValue } = market

subscribe('asset:load', loadAssets)
fetchBalance(() => {
  publish('asset:estimated_balance', { text: estimatedValue() });
  loadAssets();
});
async function loadAssets() {
  try {
    //-----PENDING ORDERS
    const orders = await getOpenOrders();
    _.forEach(orders, order => {
      publish('asset:tryToBuy', order)
    })

    //-----RUNNING TRADES
    const trades = await getTrades()
    _.forEach(trades, async trade => {
      let lastAsk = await getLastAsk(trade);
      if (!lastAsk) { publish('asset:buy:order_forgotten', trade) }
      publish('asset:track', trade)
    })

  } catch (err) {
    process.exit(1);
  }
}
