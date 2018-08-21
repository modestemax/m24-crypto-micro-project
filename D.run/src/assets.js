const { strategies } = require('common/settings');
const { valuePercent, computeChange } = require("common").candleUtils;

const assets = {};

const $this = module.exports = {
  tryToBuy({ orderId, clientOrderId, orderTime }) {
    if (clientOrderId) {
      let strategyName = clientOrderId.split('_')[0];
      if (strategyName in strategies) {
        let strategy = strategies[strategyName];
        let { cancelBidAfterSecond } = strategy;
        let now = Date.now();
        if (now - orderTime > cancelBidAfterSecond * 1e3) {
          publish("crypto:cancel_order", { orderId });
        } else {
          setTimeout(() => $this.tryToBuy.apply(this, arguments),
            orderTime + cancelBidAfterSecond * 1e3 - now
          );
        }
      }
    }
  },
  onBuy({ symbolId, clientOrderId, openPrice, quantity, stopTick }) {
    let strategyName = clientOrderId.split('_')[0];
    if (strategyName in strategies) {
      assets[clientOrderId] = {
        symbolId, clientOrderId, strategyName,
        strategy: Object.assign({}, strategies[strategyName]),
        openPrice, quantity, stopTick
      }
    }else{
      stopTick()
    }
  },
  onSell({ symbolId, clientOrderId, openPrice, quantity, }) {
    debugger
    delete assets[clientOrderId]
  },
  onBalanceChanged(balances) { },
  onPriceChanged({ symbolId, closePrice }) {
    const assetsChanged = _.filter(assets, { symbolId })
    _.forEach(assetsChanged, asset => {
      if (asset) {
        asset.closePrice = closePrice
        asset.prevChange = asset.change;
        asset.change = computeChange(asset.openPrice, asset.closePrice);
        if (asset.change !== asset.lastChange) {
          asset.maxChange = _.max([asset.maxChange, asset.change]);
          asset.minChange = _.min([asset.minChange, asset.change]);

          if (Math.abs(asset.lastChange - asset.change) > 0.1) {
            publish("trade:changed", asset);
          }
        }
        takeADecision(asset);
      }
    })
  },

}

function takeADecision(asset) {
  const { change, maxChange, strategy, symbolId, quantity, closePrice } = asset;

  const { takeProfit, stopLoss, trailingStop } = strategy;
  if (takeProfit) {
    if (change >= takeProfit) {
      publish('crypto:sell_market', asset)
      return;
    }
  }
  if (stopLoss) {
    strategy.stopLoss = Math.max(stopLoss, change > 1 ? 1 : stopLoss);
    if (change <= stopLoss) {
      publish('crypto:sell_market', asset)
      return;
    }
  }
  if (trailingStop) {
    let trail = Math.trunc(change / trailingStop) * trailingStop;
    strategy.stopLoss = Math.max(stopLoss, stopLoss + trail);
  }
  // if (valuePercent(change, maxChange) > 60 && maxChange < 1 && change > 0) {
  //   ....
  // }

}