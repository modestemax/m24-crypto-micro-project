const debug = require("debug")("D:socket");
const _ = require("lodash");
const { tryToBuy, onBuy, onSell, onPriceChanged } = require("./assets");

const { publish } = require('common/redis');

const { binance, saveAsk } = require('common');

module.exports = { listenToPriceChange, assetChangeManangement }


//--------------USER DATA------------
function assetChangeManangement() {
  binance.ws.user(async msg => {
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
                tryToBuy({ orderId,symbolId, clientOrderId, orderTime });
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
                saveAsk(order);
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

        break;
    }
  });
}

function listenToPriceChange(symbolId) {
  return binance.ws.ticker([symbolId], (price) => {
    let lastPrice = +price.curDayClose;
    onPriceChanged({ symbolId, lastPrice })
  });
}
