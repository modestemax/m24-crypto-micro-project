const debug = require("debug")("C:index");
const _ = require("lodash");

const Mutex = new require("await-mutex").default;
const mutex = new Mutex();

const RateLimiter = require("limiter").RateLimiter;
const limiter = new RateLimiter(10, "second");

const exchange = require("./exchange");
const { publish, getRedis } = require("common");
const redisSub = getRedis();

redisSub.on("pmessage", async (pattern, channel, data) => {
  const json = JSON.parse(data);
  switch (channel) {
    case "crypto-bid": debug('new bid'); bid(json); break;
    case "crypto-ask": debug('sell'); ask(json); break;
    case "cancelOrder": debug('cancel'); cancelOrder(json); break;
    case "trade:changed": debug('trade changed'); tradeChanged(json); break;
    case "trade:new": newTradeStarted(json); break;
  }
});

async function bid(signal) {
  limiter.removeTokens(1, async () => {
    let unlock = await mutex.lock();
    try {
      let { strategy, strategyOptions, exchange: exchangeId, bid, symbolId } = signal;

      await exchange.buyOder({ strategy, strategyOptions, exchangeId, symbolId, bid });
    } catch (error) {
      debug(error);
    } finally {
      unlock();
    }
  });
}

function ask(asset) {
  limiter.removeTokens(1, async () => {
    let unlock = await mutex.lock();
    try {
      await exchange.createSellOder(asset);
    } catch (error) {
      debug(error);
    } finally {
      unlock();
    }
  });
}

function cancelOrder(order) {
  exchange.cancelOrder(order);
}
function newTradeStarted(order) {
  exchange.newTradeStarted(order);
}
function tradeChanged(trade) {
  exchange.controlTrade(trade);
}

redisSub.psubscribe("crypto-bid");
redisSub.psubscribe("crypto-ask");

redisSub.psubscribe("cancelOrder");
redisSub.psubscribe("trade:*");

debug("bidder started");

process.env.STATUS_OK_TEXT = "Bider is OK";