const debug = require("debug")("C:crypto");

const Mutex = new require("await-mutex").default;
const mutex = new Mutex();

const { subscribe: redisSubscribe, publish } = require('common/redis');
const { exchange } = require("common");
const { MAX_TRADE_COUNT, strategies } = require("common/settings");

const { getAssets, estimatedValue } = require('./market');

redisSubscribe('crypto:*', {
  'crypto:cancel_order': function ({ orderId, symbolId }) {
    const market = exchange.marketsById[symbolId];
    exchange.cancelOrder(orderId, market.symbol)
  },
  'crypto:sell_market': cryptoSell,
  'crypto:sell_limit': cryptoSell,
  'crypto:buy_limit': async function ({ symbolId, openPrice, strategyName }) {

    let unlock = await mutex.lock();
    try {
      const assets = await getAssets();
      if (Object.keys(assets).filter(asset => !/BTC|BNB/.test(asset)).length < MAX_TRADE_COUNT) {
        const market = exchange.marketsById[symbolId];
        const strategy = strategies[strategyName];
        if (!assets[market.baseId] && strategy) {
          let btc = await estimatedValue(assets);
          let cost = btc / MAX_TRADE_COUNT;
          if (cost > assets.BTC.free) cost = assets.BTC.free;
          if (market.limits.cost.min < cost) {
            let quantity = exchange.amount_to_precision(market.symbol, cost / openPrice);
            exchange.createLimitBuyOrder(market.symbol, quantity, openPrice, {
              newClientOrderId: `${strategyName}_${symbolId}`,
              timeInForce: strategy.timeInForce
            });
            debug("order posted " + symbolId);
          }
        }
      }
    } finally {
      unlock();
    }


  }
});

async function cryptoSell({ symbolId, clientOrderId: newClientOrderId, quantity, closePrice, strategyName }) {
  const market = exchange.marketsById[symbolId];
  const assets = await getAssets();
  quantity = assets[market.baseId].free;
  if (quantity) {
    let args = [market.symbol, quantity,]
    let sellFunction = closePrice ? (args.push(closePrice), 'createLimitSellOrder') : 'createMarketSellOrder';
    args.push({
      newClientOrderId: newClientOrderId || `${strategyName}_${symbolId}`,
    })
    exchange[sellFunction].apply(exchange, args);
  }
}