const debug = require("debug")("C:crypto");

const { subscribe: redisSubscribe, publish } = require('common/redis');
const { exchange } = require("common");
const { MAX_TRADE_COUNT, strategies } = require("common/settings");

const { getAssets, estimatedValue } = require('./market');

redisSubscribe('crypto:*', {
  'crypto:cancel_order': function ({ orderId }) {
    exchange.cancelOrder(orderId)
  },
  'crypto:sell_market': function ({ symbolId, clientOrderId: newClientOrderId, quantity }) {
    const market = exchange.marketsById[symbolId];
    exchange.createMarketSellOrder(market.symbol, quantity, { newClientOrderId });
  },
  'crypto:sell_limit': async function ({ symbolId, closePrice, strategyName }) {
    const market = exchange.marketsById[symbolId];
    const assets = await getAssets();
    const quantity = assets[market.baseId].free;
    if (quantity) {
      exchange.createLimitSellOrder(market.symbol, quantity, closePrice, {
        newClientOrderId: `${strategyName}_${symbolId}`,
      });
    }
  },
  'crypto:buy_limit': async function ({ symbolId, openPrice, strategyName }) {
    const assets = await getAssets();
    const market = exchange.marketsById[symbolId];
    const strategy = strategies[strategyName];
    if (!assets[market.baseId] && strategy) {
      let btc = estimatedValue(assets);
      let cost = btc / MAX_TRADE_COUNT;
      let quantity = (cost / openPrice);
      if (market.limits.cost.min < cost) {
        exchange.createLimitBuyOrder(market.symbol, quantity, openPrice, {
          newClientOrderId: `${strategyName}_${symbolId}`,
          timeInForce: strategy.timeInForce
        });
        debug("order posted " + symbolId);
      }
    }

  }
});
 
