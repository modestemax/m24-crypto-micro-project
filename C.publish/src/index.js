const debug = require("debug")("bid:order");
const _ = require("lodash");

const Mutex = new require("await-mutex").default;
const mutex = new Mutex();

const RateLimiter = require("limiter").RateLimiter;
const limiter = new RateLimiter(10, "second");

const exchange = require("./exchange");
const { publish, getRedis, psubscribe } = require("common");
const redisSub = getRedis();

redisSub.on("pmessage", async (pattern, channel, data) => {
  const json = JSON.parse(data);
  switch (channel) {
    case "crypto-bid":
      debug('new bid');
      bid(json);
      break;
    case "crypto-ask":
      debug('sell');
      ask(json);
      break;
    case "cancelOrder": debug('cancel'); cancelOrder(json); break;
    case "trade:changed": debug('trade changed'); tradeChanged(json); break;
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

function ask(order) {
  limiter.removeTokens(1, async () => {
    let unlock = await mutex.lock();
    try {
      let { strategy, strategyOptions, exchange: exchangeId, ask, symbolId } = signal;

      await exchange.sellOder({ strategy, strategyOptions, exchangeId, symbolId, ask });
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

function tradeChanged(trade) {
  exchange.controlTrade(trade);
}

redisSub.psubscribe("crypto-bid");
redisSub.psubscribe("crypto-ask");

redisSub.psubscribe("cancelOrder");
redisSub.psubscribe("trade:changed");

debug("bidder started");
