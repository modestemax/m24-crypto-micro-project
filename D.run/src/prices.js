const _ = require('lodash')
const { exchange, binance, redis } = require("common");
const { subscribe, publish } = redis;

const assets = {};

module.exports = async function fetchTickers() {

  subscribe('m24:exchange:fetchTickers', function () {
    publish('m24:exchange:tickers', assets)
  });

  Object.assign(assets, await exchange.fetchTickers());
  setInterval(() => _.mapValues(assets, a => null), 30e3);

  const symbols = Object.keys(exchange.marketsById).filter(s => /BTC$/.test(s));
  binance.ws.ticker(symbols, async (price) => {
    let info = Object.assign({}, price, {
      askPrice: +price.bestAsk,
      askQty: +price.bestAskQnt,
      bidPrice: +price.bestBid,
      bidQty: +price.bestBidQnt,
      // closeTime:1535303385355
      count: +price.closeTradeQuantity,//1582
      firstId: price.firstTradeId,
      highPrice: +price.high,
      lastId: price.lastTradeId,
      lastPrice: +price.curDayClose,
      lastQty: price.totalTrades,//?
      lowPrice: +price.low,
      openPrice: +price.open,
      // openTime:1535216983594
      prevClosePrice: +price.prevDayClose,//?
      // priceChange:"-0.00000018"
      // priceChangePercent:"-1.287"
      // symbol:"ADABTC"
      // volume:"77093700.00000000"
      quoteVolume: price.volumeQuote,
      weightedAvgPrice: price.weightedAvg
    });
    let p1 = exchange.parseTicker(info);
    assets[p1.symbol] = p1;

    //let p2 = await exchange.fetchTickers(p1.symbol);
    // debugger
    // exchange.parseTickers(rawTickers, symbols);
  });
console.log('listening tick for ',symbols.length,' symbols')
}
