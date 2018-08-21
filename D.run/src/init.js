const { onBuy: trackAsset, tryToBuy } = require('./assets');
const { listenToPriceChange, assetChangeManangement } = require('./socket');
const { subscribe: redisSubscribe, publish } = require('common/redis');


redisSubscribe('asset:*', {
  'asset:track': function ({ symbolId,clientOrderId, price, quantity }) {    
    trackAsset({ symbolId,clientOrderId, price, quantity, stopTick: listenToPriceChange(symbolId) });
  },
  'asset:tryToBuy': function ({ orderId, clientOrderId, orderTime }) {
    tryToBuy({ orderId, clientOrderId, orderTime })
  }
});

assetChangeManangement();

