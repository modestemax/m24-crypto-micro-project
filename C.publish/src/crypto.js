const debug = require("debug")("C:crypto");

const Mutex = new require("await-mutex").default;
const mutex = new Mutex();
const _=require('lodash');

const { subscribe: redisSubscribe, publish } = require('common/redis');
const { exchange, getLastAsk } = require("common");
const { MAX_TRADE_COUNT, strategies } = require("common/settings");

const { getAssets, estimatedValue } = require('./market');

const [cryptoBuyThrottled,cryptoSellThrottled]=[_.throttle(cryptoBuy,2e3),_.throttle(cryptoSell,2e3)]

const bid_ask = {};

redisSubscribe('crypto:*', {
  'crypto:cancel_order': function ({ orderId, symbolId }) {
    const market = exchange.marketsById[symbolId];
    exchange.cancelOrder(orderId, market.symbol)
  },
  'crypto:sell_market': cryptoSellThrottled,
  'crypto:sell_limit': cryptoSellThrottled,
  'crypto:buy_limit': cryptoBuyThrottled
});

async function cryptoBuy ({ symbolId, openPrice, strategyName }) {
  const newClientOrderId = `${strategyName}_${symbolId}`;
  if (bid_ask[newClientOrderId] === 'bid') return;
  let unlock;
  try {
    // unlock = await mutex.lock();
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
          try {
            await exchange.createLimitBuyOrder(market.symbol, quantity, openPrice, {
              newClientOrderId,
              timeInForce: strategy.timeInForce
            });
            bid_ask[newClientOrderId] = 'bid';
            debug("order posted " + symbolId);
          } catch (ex) {
            publish('m24:fatal', "BID FAILLED " + newClientOrderId + ' at ' + openPrice)
            publish('m24:error', ex)
          }
        }
      }
    }
  } finally {
    unlock && unlock();
  }
}
async function cryptoSell({ symbolId, clientOrderId: newClientOrderId, quantity, closePrice, strategyName }) {
  newClientOrderId = newClientOrderId || `${strategyName}_${symbolId}`
  if (bid_ask[newClientOrderId] === 'ask') return;
  let unlock;
  try {
    // unlock = await mutex.lock();
    const market = exchange.marketsById[symbolId];
    const assets = await getAssets();
    const asset = assets[market.baseId];
    const freeQuantity = asset && asset.free;
    const totalQuantity = asset && asset.total;
    if (freeQuantity) {
      let args = [market.symbol, freeQuantity,]
      let sellFunction = closePrice ? (args.push(closePrice), 'createLimitSellOrder') : 'createMarketSellOrder';
      args.push({
        newClientOrderId: newClientOrderId || `${strategyName}_${symbolId}`,
      })
      exchange[sellFunction].apply(exchange, args);
    } else if (totalQuantity) {
      let lastAsk = await getLastAsk({ clientOrderId: newClientOrderId });
      if (lastAsk) {
        if (+lastAsk.price !== +exchange.priceToPrecision(market.symbol, closePrice)) {
          try {
            await exchange.editLimitSellOrder(lastAsk.orderId, market.symbol, totalQuantity, closePrice, {
              newClientOrderId: newClientOrderId,
            });
            bid_ask[newClientOrderId] = 'ask';
          } catch (ex) {
            publish('m24:fatal', "ASK FAILLED " + newClientOrderId + ' at ' + closePrice)
            publish('m24:error', ex)
          }
        }
      }
    }
  } finally {
    unlock && unlock();
  }
}