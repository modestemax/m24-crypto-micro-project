const { onBuy: trackAsset, tryToBuy } = require('./assets');
const { listenToPriceChange, assetChangeManangement } = require('./socket');
const { subscribe: redisSubscribe, publish } = require('common/redis');


redisSubscribe('asset:*', {
  'asset:track': function ({ symbolId, clientOrderId, openPrice, quantity }) {
    trackAsset({ symbolId, clientOrderId, openPrice, quantity, stopTick: listenToPriceChange(symbolId) });
  },
  'asset:tryToBuy': function ({ orderId, symbolId,clientOrderId, orderTime }) {
    tryToBuy({ orderId,symbolId, clientOrderId, orderTime })
  }
});

assetChangeManangement();
publish('asset:load',{});
