const debug = require("debug")("D:index");
const _ = require("lodash");
const { strategies, exchangeIds } = require("common/settings");
const { auth, loadOrders, saveOder, saveSellOder, delOder,  /* delExpiredOrders,*/ saveTrade,
  loadOrder, computeChange, getFreeBalance, loadMarkets, loadTrades, loadTrade,
  loadBalances, delTrade, saveBalances, loadOrderStrategy, publish
} = require("common");

const Binance = require("binance-api-node").default;
const client = Binance({ apiKey: auth.api_key, apiSecret: auth.secret });

// const tickersClean = [];
//startup
cleanOrders().then(start);

/**
 * delete orders saved in redis database which don't exists in binance
 */
async function cleanOrders() {
  let orders = await loadOrders();
  let binanceOrders = [];
  _.forEach(orders, async order => {
    let binOrders = (binanceOrders[order.symbolId] =
      binanceOrders[order.symbolId] ||
      (await client.openOrders({ symbol: order.symbolId })));

    if (!_.find(binOrders, { newClientOrderId: order.newClientOrderId })) {
      delOder(order);
    }
  });
}

// async function cleanTrades() {
//   const exchangeId = "binance";
//   const [trades, balances, exchange] = await Promise.all([
//     loadTrades(),
//     loadBalances(exchangeId, true),
//     loadMarkets({ exchangeId })
//   ]);

//   _.forEach(trades, async trade => {
//     if (!balances[exchange.marketsById[trade.symbolId].baseId].total) {
//       delTrade(trade);
//     }
//   });
// }
function estimatedValue({ assets, prices }) {
  // _.forEach(assets,asset=>{
  //   debugger
  // })
  let totalBTC = _.reduce(assets, (total, { asset, free, locked }) => {
    totalAsset = +free + +locked;
    if (asset === QUOTE_ASSET) {
      return total + totalAsset
    } else if (prices[asset + QUOTE_ASSET]) {
      return total + totalAsset * prices[asset + QUOTE_ASSET];
    } else return total
  }, 0)
  return totalBTC
}

async function start() {
  cancelExpiredOrders();
  onUserData();
  let prices = await client.prices();
  let assets = _.filter((await client.accountInfo()).balances, ({ free, locked }) => +free + +locked);
  // _.forEach(assets,asset=>{
  //   debugger
  // })
  let totalBTC = estimatedValue({ assets, prices });
  debugger;
  //check here

  (await loadTrades()).forEach(trade => {
    let base = trade.symbolId
      .split("")
      .splice(0, trade.symbolId.length - 3)
      .join("");
    if (balances[base] && balances[base].total) {
      observeTrade(trade);
    } else {
      delTrade(trade);
    }
  });
  debug("started");
}

//-----------ORDERS--------------

function cancelExpiredOrders() {
  _.forEach(loadOrders(), cancelExpiredOrder);
}

async function cancelExpiredOrder(order, strategy) {
  let { orderTime, orderId, symbolId } = order;
  let now = Date.now();
  strategy = strategy || (await loadOrderStrategy(order)) || {};

  let { cancelBidAfterSecond } = strategy;
  if (now - orderTime > cancelBidAfterSecond * 1e3) {
    publish("cancelOrder", order);
  } else {
    cancelExpiredOrder[orderId] = setTimeout(
      () => cancelExpiredOrder(order, strategy),
      orderTime + cancelBidAfterSecond * 1e3 - now
    );
  }
}

async function createOrder(order) {
  saveOder(order);
  cancelExpiredOrder(order);
}

function deleteOrder(order) {
  delOder(order);
  clearInterval(cancelExpiredOrder[order.orderId]);
  delete cancelExpiredOrder[order.orderId];
}

//---------------TRADES----------
function deleteTrade(trade) {
  //  clearTick(trade);
  delTrade(trade);
}

//---------TICKERS---------------
function listenTick(symbol, onTick) {
  return client.ws.ticker([symbol], onTick);
}

// async function clearTick({ symbolId }) {
//   let trades = await loadTrades({ symbolId });
//   if (trades.length<=1 && tickersClean[symbolId]) {
//     tickersClean[symbolId]();
//     delete tickersClean[symbolId];
//   }
// }

//--------------USER DATA------------
function onUserData() {
  client.ws.user(async msg => {
    switch (msg.eventType) {
      case "executionReport":
        const order = Object.assign({ symbolId: msg.symbol }, msg);
        delete order.symbol;
        switch (msg.side) {
          case "BUY":
            switch (msg.orderStatus) {
              case "NEW":
                //new order
                debug("trying to buy " + order.symbolId);
                tryToBuy(order);
                publish("binance:buy:order", order);
                break;
              case "FILLED":
                //filled bid    
                debug("buy ok " + order.symbolId);
                onBuy(order);
                publish("binance:buy:success", order);
                break;
              case "EXPIRED":
                //filled bid
                debug("buy fail " + order.symbolId);
                publish("binance:buy:oredr_expired", order);
                break;
              case "CANCELED":
                debug("order CANCELED " + order.symbolId);
                publish("binance:buy:oredr_canceled", order);
                break;
            }
            break;
          case "SELL":
            switch (msg.orderStatus) {
              case "NEW":
                //new order
                // debug("new sell order detected " + order.symbolId);
                // createSellOrder(order);
                // publish("trade:new", order);
                break;
              case "FILLED":
                //filled bid                
                publish("binance:sell:success", order);
                break;
              case "REJECTED":
                switch (msg.orderRejectReason) {
                  case "INSUFFICIENT_BALANCE":

                    break;
                }
                break;
            }
            break;
        }
        break;
      case "account":
        onBalanceChanged(msg.balances);
        break;
    }
  });
}

async function observeTrade(trade) {
  const clear = listenTick(trade.symbolId, async tick => {
    if (!(await loadTrade(trade))) return clear();

    trade.lastPrice = +tick.curDayClose;
    trade.lastChange = trade.change;
    trade.change = computeChange(trade.price, trade.lastPrice);
    if (trade.change !== trade.lastChange) {
      trade.maxChange = _.max([trade.maxChange, trade.change]);
      trade.minChange = _.min([trade.minChange, trade.change]);

      if (Math.abs(trade.lastChange - trade.change) > 0.1) {
        publish("trade:changed", trade);
      }
    }
  });
}

function onBuy() {

}

function onSell() {

}



process.env.STATUS_OK_TEXT = "Binance User Data Listener is OK";