const { market } = require('common');
const { getOpenOrders, getTrades } = market;
const _ = require('lodash');
const { publish, subscribe } = require('common/redis');
const { fetchBalance, market } = require("common");
const { estimatedValue } = market

subscribe('asset:load', loadAssets)
loadAssets();
fetchBalance(() => publish('asset:estimated_balance', { text: estimatedValue() }));
async function loadAssets() {
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
    process.exit(1);
  }
}
