const _ = require('lodash');
const { strategies } = require('common/settings');
const { candleUtils, loadAsset, delAsset, saveAsset, exchange, redis } = require("common");
const { valuePercent, computeChange } = candleUtils;
const { publish } = redis;
const assets = {};
const saveAssetThrottled = _.throttle(saveAsset, 30e3);

const $this = module.exports = {
  tryToBuy({ orderId, symbolId, clientOrderId, orderTime }) {
    if (clientOrderId) {
      let strategyName = clientOrderId.split('_')[0];
      if (strategyName in strategies) {
        let strategy = strategies[strategyName];
        let { cancelBidAfterSecond } = strategy;
        let now = Date.now();
        if (now - orderTime > cancelBidAfterSecond * 1e3) {
          publish("crypto:cancel_order", { orderId, symbolId });
        } else {
          setTimeout(() => $this.tryToBuy.apply(this, arguments),
            orderTime + cancelBidAfterSecond * 1e3 - now
          );
        }
      }
    }
  },
  async onBuy({ symbolId, clientOrderId, openPrice, quantity, timestamp, stopTick }) {
    let strategyName = clientOrderId.split('_')[0];
    if (strategyName in strategies) {
      let asset = await loadAsset({ clientOrderId });
      if (asset && !(asset.openPrice == openPrice && asset.quantity == quantity)) {
        delAsset(asset)
      }
      assets[clientOrderId] = Object.assign({}, asset, {
        symbolId, clientOrderId, strategyName, timestamp,
        strategy: Object.assign({}, strategies[strategyName]),
        openPrice, quantity, stopTick
      })

    } else {
      stopTick()
    }
  },
  onSell({ symbolId, clientOrderId, price, quantity }) {
    // debugger
    const asset = assets[clientOrderId];
    if (asset) {
      asset.stopTick();
      delete assets[clientOrderId];
      // $this.onPriceChanged({ symbolId: asset.symbolId, lastPrice: price });
      publish("asset:sell:success", asset);
    } else {
      publish("asset:sell:success", { symbolId, clientOrderId, closePrice: price, quantity });
    }

  },

  onPriceChanged({ symbolId, lastPrice }) {

    const assetsChanged = _.filter(assets, { symbolId })
    _.forEach(assetsChanged, asset => {
      if (asset) {
        saveAssetThrottled(asset);
        asset.closePrice = lastPrice
        asset.prevChange = asset.change;
        asset.change = computeChange(asset.openPrice, asset.closePrice);
        if (asset.change !== asset.prevChange) {
          asset.maxChange = _.max([asset.maxChange, asset.change]);
          asset.minChange = _.min([asset.minChange, asset.change]);

          if (!asset.prevChange||Math.abs(asset.prevChange - asset.change) > 0.01) {
            publish("asset:value_changed", asset);
          }
        }
        takeADecision(asset);
      }
    })
  },

}

function takeADecision(asset) {

  const { change, maxChange, strategy, symbolId, quantity, closePrice } = asset;

  const { takeProfit, stopLoss, trailingStop, selfStop } = strategy;
  if (!selfStop) {
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
  } else {
    publish('crypto:self_stop', asset)
  }
  // if (valuePercent(change, maxChange) > 60 && maxChange < 1 && change > 0) {
  //   ....
  // }

}