const debug = require("debug")("C:market");
const _ = require("lodash");

// const exchange = require("./exchange");
const {  exchange } = require("common");


const $this = module.exports = {
  async   getOpenOrders() {
    const orders = _.filter(await exchange.fetchOpenOrders(), { side: 'buy' }).map(order => {

      return {
        symbolId: order.info.symbol,
        clientOrderId: order.info.clientOrderId,
        openPrice: order.price,
        quantity: order.remaining,
        orderId: order.info.orderId,
        orderTime: order.timestamp
      }
    })
    return orders;
  },

  async   getAssets() {
    let prices = await exchange.fetchTickers();
    let assets = await exchange.fetchBalance();

    return _.reduce(assets, (assets, balance, asset) => {
      let symbol = asset + '/BTC';
      let price = prices[symbol];
      return price && balance.free * price.close > 0.001 ?
        Object.assign(assets, { [asset]: Object.assign(balance, { btc: balance.total * price.close }) })
        : asset === 'BTC' ?
          Object.assign(assets, { [asset]: Object.assign(balance, { btc: balance.total }) })
          : assets
    }, {});

  },

  async   getTrades() {

    let myAssets = await $this.getAssets();

    return Promise.all(_.map(_.omit(myAssets, ['BTC', 'BNB']), async (balance, asset) => {
      let orders = await exchange.fetchClosedOrders(asset + '/BTC');
      let order = _(orders).filter({ side: 'buy', status: 'closed' }).last();
      return {
        symbolId: order.info.symbol,
        clientOrderId: order.info.clientOrderId,
        openPrice: order.price,
        quantity: order.filled
      }
    }))
  },
  async estimatedValue(assets) {
    let myAssets = assets || await $this.getAssets();
    return _.sumBy(_.toArray(myAssets), 'btc')
  }
}
