const debug = require('debug')('common:exchange');
const _ = require("lodash");
const ccxt = require("ccxt");
const { saveBalances, loadBalances } = require('./utils')
const { subscribe, publish } = require('./redis');
const auth = require(process.env.HOME + '/.api.json').KEYS;

const Binance = require("binance-api-node").default;
const binance = Binance({ apiKey: auth.api_key, apiSecret: auth.secret });



module.exports = { exchange: getExchange(auth), binance }

function getExchange(auth) {
  const exchange = new ccxt['binance']({
    apiKey: auth.api_key,
    secret: auth.secret,
    // verbose: process.env.NODE_ENV !== 'production',
    timeout: process.env.NODE_ENV === 'production' ? 20e3 : 20e3,
    enableRateLimit: true,
    options: {
      "warnOnFetchOpenOrdersWithoutSymbol": false,
      adjustForTimeDifference: true,
      // verbose: true, // if needed, not mandatory
      recvWindow: 10000000 // not really needed
    }
  });
  exchange.loadMarkets();
  overrides(exchange);
  rateLimit(exchange);
  return exchange;
}

function overrides(exchange){
  // exchange._fetchTickers = exchange.fetchTickers;
}

const Mutex = new require("await-mutex").default;
const mutex = new Mutex();

const RateLimiter = require("limiter").RateLimiter;
const limiter = new RateLimiter(10, "second");

function rateLimit(exchange) {

  // exchange.fetchBalance = _.wrap(exchange.fetchBalance, async (fetchBalance, ...args) => {
  //   let balance = await loadBalances();
  //   if (!balance) {
  //     balance = await fetchBalance.apply(exchange, args)
  //     saveBalances(balance);
  //   }
  //   return balance;
  // });


  // exchange.fetchTickers = _.wrap(exchange.fetchTickers, (fetchTickers, ...args) => {
  //   return new Promise((resolve) => {
  //     // console.log('fetchTickers from redis event')
  //     let unsubscribe = subscribe('m24:exchange:tickers', async (tickers) => {
  //       // clearTimeout(timeout);
  //       // console.log('fetchTickers from redis event OK')
  //       unsubscribe();
  //       resolve(tickers && Object.keys(tickers).length > 0 ? tickers : (await fetchTickers.apply(exchange)));
  //     });
  //     // let timeout = setTimeout(async () => {
  //     //   unsubscribe();
  //     //   resolve((await fetchTickers.apply(exchange)));
  //     // }, 1e3)
  //     publish('m24:exchange:fetchTickers');
  //   })
  // });


  ['fetchBalance', 'fetchTickers', 'fetchOrder', 'fetchOrders', 'createOrder', 'cancelOrder'].forEach(apiName => {

    exchange[apiName] = _.wrap(exchange[apiName], (apiCall, ...args) => {
      return new Promise((resolve, reject) => {
        limiter.removeTokens(1, async () => {
          let unlock;
          // let unlock = await mutex.lock();
          try {
            apiCall.name !== 'wrapper' && console.log("binance api call " + apiName)
            resolve(await apiCall.apply(exchange, args));
            apiCall.name !== 'wrapper' && console.log("binance api call success " + apiName)
          } catch (error) {
            reject(error);
            apiCall.name !== 'wrapper' && console.log("binance api fail " + apiName)
            console.error(error);
          } finally {
            unlock && unlock();
          }
        });
      })

    })
  })


}
