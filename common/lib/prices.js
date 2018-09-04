const _ = require('lodash')
const { exchange, binance } = require('./exchange')
const { subscribe, publish } = require("./redis");
const { saveBalances, clearBalances } = require('./utils')
const assets = {};
const tickCallbacks = [];
const balanceCallbacks = [];


module.exports = {
  async   fetchTickers(callback) {


    if (!tickCallbacks.length) {
      tickCallbacks.push(callback);
      Object.assign(assets, await exchange._fetchTickers());
      subscribe('m24:exchange:fetchTickers', function () {
        publish('m24:exchange:tickers', assets)
      });
      // setInterval(() => _.mapValues(assets, a => null), 30e3);

      const symbols = Object.keys(exchange.marketsById).filter(s => /BTC$/.test(s));
      binance.ws.ticker(symbols, async (rawPrice) => {
        let price = Object.assign({}, rawPrice, {
          askPrice: +rawPrice.bestAsk,
          askQty: +rawPrice.bestAskQnt,
          bidPrice: +rawPrice.bestBid,
          bidQty: +rawPrice.bestBidQnt,
          // closeTime:1535303385355
          count: +rawPrice.closeTradeQuantity,//1582
          firstId: rawPrice.firstTradeId,
          highPrice: +rawPrice.high,
          lastId: rawPrice.lastTradeId,
          lastPrice: +rawPrice.curDayClose,
          lastQty: rawPrice.totalTrades,//?
          lowPrice: +rawPrice.low,
          openPrice: +rawPrice.open,
          // openTime:1535216983594
          prevClosePrice: +rawPrice.prevDayClose,//?
          // priceChange:"-0.00000018"
          // priceChangePercent:"-1.287"
          // symbol:"ADABTC"
          // volume:"77093700.00000000"
          quoteVolume: rawPrice.volumeQuote,
          weightedAvgPrice: rawPrice.weightedAvg
        });
        price = exchange.parseTicker(price);
        assets[price.symbol] = price;
        tickCallbacks.forEach(cb => cb(price, assets));
      });
      console.log('listening tick for ', symbols.length, ' symbols')
    }
  },

  fetchBalance(callback) {
    if (!balanceCallbacks.length) {
      balanceCallbacks.push(callback);
      clearBalances()
      binance.ws.user(async msg => {
        switch (msg.eventType) {
          case "account":
            let bal = _.mapValues(msg.balances, b =>
              ({ free: +b.available, used: +b.locked, total: +b.available + +b.locked }))
            // let bal2 = await exchange.fetchBalance();            
            saveBalances(bal)
            balanceCallbacks.forEach(cb => cb(bal));
            break;
        }
      });
    }

  }
}
