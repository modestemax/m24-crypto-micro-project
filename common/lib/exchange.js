const _ = require("lodash");
const ccxt = require("ccxt");
const { loadBalances } = require('./utils')
const { subscribe, publish } = require('./redis');
const auth = require(process.env.HOME + '/.api.json').KEYS;

const Binance = require("binance-api-node").default;
const binance = Binance({ apiKey: auth.api_key, apiSecret: auth.secret });



module.exports = { exchange: getExchange(auth), binance }

function getExchange(auth) {
  const exchange = new ccxt['binance']({
    apiKey: auth.api_key,
    secret: auth.secret,
    // verbose: true,
    options: {
      "warnOnFetchOpenOrdersWithoutSymbol": false,
      adjustForTimeDifference: true,
      verbose: true, // if needed, not mandatory
      recvWindow: 10000000 // not really needed
    }
  });
  exchange.loadMarkets();
  rateLimit(exchange);
  return exchange;
}


const Mutex = new require("await-mutex").default;
const mutex = new Mutex();

const RateLimiter = require("limiter").RateLimiter;
const limiter = new RateLimiter(10, "second");

function rateLimit(exchange) {

  ['fetchBalance', 'fetchTickers', 'fetchOrder', 'fetchOrders', 'createOrder', 'cancelOrder'].forEach(apiName => {

    exchange[apiName] = _.wrap(exchange[apiName], (apiCall, ...args) => {
      return new Promise((resolve, reject) => {
        limiter.removeTokens(1, async () => {
          let unlock = await mutex.lock();
          try {
            resolve(await apiCall.apply(exchange, args));
          } catch (error) {
            reject(error);
            debug(error);
          } finally {
            unlock();
          }
        });
      })

    })
  })


  exchange.fetchBalance = _.wrap(exchange.fetchBalance, async (fetchBalance, ...args) => {
    let balance = await loadBalances();
    if (!balance) {
      balance = await fetchBalance.apply(exchange, args)
    }
    return balance;
  });


  exchange.fetchTickers = _.wrap(exchange.fetchTickers, (fetchTickers, ...args) => {
    return new Promise((resolve) => {
      let unsubscribe = subscribe('m24:exchange:tickers', async (tickers) => {
        resolve(tickers && Object.keys(tickers).length > 0 ? tickers : (await fetchTickers.apply(exchange)));
        unsubscribe();
      });
      publish('m24:exchange:fetchTickers');
    })
  });
}



// exchange.fetchTickers();
// let assets = await exchange.fetchBalance();