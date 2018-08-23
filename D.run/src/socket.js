const debug = require("debug")("D:socket");
const _ = require("lodash");
const { tryToBuy, onBuy, onSell, onBalanceChanged, onPriceChanged } = require("./assets");
const { auth } = require("common");
const {  publish } = require('common/redis');

const Binance = require("binance-api-node").default;
const client = Binance({ apiKey: auth.api_key, apiSecret: auth.secret });

module.exports = { listenToPriceChange, assetChangeManangement }


//--------------USER DATA------------
function assetChangeManangement() {
  client.ws.user(async msg => {
    switch (msg.eventType) {
      case "executionReport":
        const order = Object.assign({ symbolId: msg.symbol }, msg);
        order.clientOrderId = order.clientOrderId || order.newClientOrderId;
        const { symbolId, orderId, newClientOrderId: clientOrderId, price, quantity, orderTime } = order;
        switch (msg.side) {
          case "BUY":
            switch (msg.orderStatus) {
              case "NEW":
                //new order
                debug("trying to buy " + order.symbolId);
                tryToBuy({ orderId, clientOrderId, orderTime });
                publish("asset:buy:order_new", order);
                break;
              case "FILLED":
                //filled bid    
                debug("buy ok " + order.symbolId);
                onBuy({ symbolId, clientOrderId, openPrice: price, quantity, stopTick: listenToPriceChange(symbolId) });
                publish("asset:buy:success", order);
                break;
              case "EXPIRED":
                //filled bid
                debug("buy fail " + order.symbolId);
                publish("asset:buy:order_expired", order);
                break;
              case "CANCELED":
                debug("order CANCELED " + order.symbolId);
                publish("asset:buy:order_canceled", order);
                break;
            }
            break;
          case "SELL":
            switch (msg.orderStatus) {
              case "NEW":
                //new order
                // debug("new sell order detected " + order.symbolId);
                // createSellOrder(order);
                publish("asset:sell:order_new", order);
                break;
              case "FILLED":
                //filled bid        
                debug("sell ok " + order.symbolId);
                onSell(order);
                // publish("asset:sell:success", order);
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

function listenToPriceChange(symbolId) {
  return client.ws.ticker([symbolId], (price) => {
    let lastPrice = +price.curDayClose;
    onPriceChanged({ symbolId, lastPrice })
  });
}