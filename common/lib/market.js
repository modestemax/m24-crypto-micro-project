const debug = require("debug")("C:market");
const _ = require("lodash");

const { fetchBalance } = require("./prices");
const { exchange } = require("./exchange");
const assets = {};

fetchBalance((balance) => Object.assign(assets, balance));

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
  async getAssetBalance(assetId, part) {
    let assets = await $this.getAssets();
    if (assets && assets[assetId]) {
      return assets[assetId][part || 'total'];
    }
    return 0;
  },

  async   getAssets() {
    let prices = await exchange.fetchTickers();
    Object.keys(assets).length || Object.assign(assets, await exchange.fetchBalance());

    return _.reduce(assets, (assets, balance, asset) => {
      let symbol = asset + '/BTC';
      let price = prices[symbol];
      if (asset === 'BTC') {
        return Object.assign(assets, { [asset]: Object.assign(balance, { btc: balance.total }) })
      } else if (price) {
        let btc = balance.total * price.close;
        if (btc > 0.001) {
          return Object.assign(assets, { [asset]: Object.assign(balance, { btc }) });
        }
      }
      return assets;
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
        quantity: order.filled,
        timestamp: order.timestamp
      }
    }))
  },
  async estimatedValue(assets) {
    let myAssets = assets || await $this.getAssets();
    return _.sumBy(_.toArray(myAssets), 'btc')
  }
}
