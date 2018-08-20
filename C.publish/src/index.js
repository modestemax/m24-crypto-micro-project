const debug = require("debug")("C:index");
const _ = require("lodash");

// const exchange = require("./exchange");
const { publish, exchange } = require("common");



const $this = module.exports = {
  async   getOpenOrders() {
    const orders = _.filter(await exchange.fetchOpenOrders(), { side: 'buy' }).map(order => {
      debugger;
      return {
        symbolId: order.info.symbol,
        clientOrderId: order.info.clientOrderId,
        openPrice: order.price,
        quantity: order.remaining
      }
    })
    return orders;
  },

  async   getAssets() {
    let prices = await exchange.fetchTickers();
    let assets = await exchange.fetchBalance();
    debugger
    return _.reduce(assets,
      (assets, balance, asset) => {
        let symbol = asset + '/BTC';
        let price = prices[symbol];
        return price && balance.free * price.close > 0.001 ?
          Object.assign(assets, { [asset]: balance, btc: balance.total * price.close }) : assets
      }, {});

  },

  async   getTrades() {

    let myAssets = await $this.getAssets();

    return Promise.all(_.map(myAssets, async (balance, asset) => {
      let orders = await exchange.fetchClosedOrders(asset + '/BTC');
      let order = _(orders).filter({ side: 'buy', status: 'closed' }).last();
      return {
        symbolId: order.info.symbol,
        clientOrderId: order.info.clientOrderId,
        price: order.price,
        quantity: order.filled
      }
    }))
  },
 async estimatedValue() {
    let myAssets = await $this.getAssets();
    _.sumBy(myAssets, 'btc')
  }
}


$this.getAssets();