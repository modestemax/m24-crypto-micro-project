const debug = require("debug")("C:market");
const _ = require("lodash");

const { fetchBalance,tickers, assets} = require("./prices");
const { exchange } = require("./exchange");
const { publish } = require("./redis");

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
   getAssetBalance(assetId, part) {
    let nonNulAssets =  $this.getNonNulAssets();
    if (nonNulAssets && nonNulAssets[assetId]) {
      return nonNulAssets[assetId][part || 'total'];
    }
    return 0;
  },

     getNonNulAssets() {  
    return _.reduce(assets, (nonNulAssets, balance, asset) => {
      let symbol = asset + '/BTC';
      let ticker = tickers[symbol];
      if (asset === 'BTC') {
        return Object.assign(nonNulAssets, { [asset]: Object.assign(balance, { btc: balance.total }) })
      } else if (ticker) {
        let btc = balance.total * ticker.close;
        if (btc > 0.001) {
          return Object.assign(nonNulAssets, { [asset]: Object.assign(balance, { btc }) });
        }
      }
      return nonNulAssets;
    }, {});

  },

  async   getTrades() {

    let nonNulAssets =  $this.getNonNulAssets();

    return Promise.all(_.map(_.omit(nonNulAssets, ['BTC', 'BNB']), async (balance, asset) => {
      let orders = await exchange.fetchOrders(asset + '/BTC');
      // let order = _(orders).filter({ side: 'buy', status: 'closed' }).last();
      let buyOrder = _(orders).filter({ side: 'buy',  }).last();
      let sellOrder = _(orders).filter({ side: 'sell',  }).last();
      return {
        symbolId: buyOrder.info.symbol,
        clientOrderId: buyOrder.info.clientOrderId,
        openPrice: buyOrder.price,
        quantity: buyOrder.filled,
        timestamp: buyOrder.timestamp,
        forgotten:!!asset.free,
        sellOrder
      }
    }))
  },
   estimatedValue() {    
    return _.sumBy(_.toArray(  $this.getNonNulAssets()), 'btc').toFixed(8)
  }
}


