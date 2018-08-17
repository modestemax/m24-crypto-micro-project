const debug = require("debug")("F:telegram");
const { valuePercent } = require("common");

const { bot, tme, MAXChatId, XBTTraderChatId } = require('./bot');
const getMessageText = require('./message-builder');


module.exports = new class {

  constructor() {
    tme.sendMessage({
      chat_id: XBTTraderChatId,
      text: [
        "Bot started ",
      ].join("\n")
    });
  }

  newOrder(order) {
    const { price: bid, symbolId, newClientOrderId } = order;
    const strategy = newClientOrderId.split("_")[0];

    tme.sendMessage({
      chat_id: XBTTraderChatId,
      text: [
        "A new /order was posted",
        `${strategy}, ${symbolId} at ${bid}`
      ].join("\n")
    });
  }

  newTrade(trade) {
    const { price: bid, symbolId, target, stopLoss, newClientOrderId } = trade;
    const strategyName = newClientOrderId.split("_")[0];
    const targetPrice = valuePercent(bid, target);
    const stopPrice = valuePercent(bid, stopLoss);

    tme.sendMessage({
      chat_id: XBTTraderChatId,
      text: [
        "A new /trade is running",
        `${strategyName}, ${symbolId}`,
        `bid : ${bid}`,
        `target : ${target} [${targetPrice}]`,
        `stopLoss : ${stopLoss} [${stopPrice}]`,
        `trailling : ${trailling}`
      ].join("\n")
    });
  }

  tradeChanged(trade) {
    const { symbolId, change, strategy, newClientOrderId } = trade;
    const strategyName = newClientOrderId.split("_")[0];
    const targetStatus =
      change >= strategy.takeProfit ? "Success" : change > 0 ? "Ok" : "Fail";

    tme.sendMessage({
      chat_id: XBTTraderChatId,
      text: [
        "trade changed",
        `${strategyName}, ${symbolId}`,
        `change : ${change.toFixed(2)}% [${targetStatus}]`
      ].join("\n")
    });
  }

  orderExpiredOrCanceled(order) {
    const { symbolId, newClientOrderId } = order;
    const strategyName = newClientOrderId.split("_")[0];
    tme.sendMessage({
      chat_id: XBTTraderChatId,
      text: ["order expired/canceled", `${strategyName}, ${symbolId}`].join("\n")
    });
  }

  endTrade(trade) {
    const { price: bid, ask, symbolId, change, target, newClientOrderId } = trade;
    const strategyName = newClientOrderId.split("_")[0];
    const targetStatus =
      change >= target ? "Success" : change > 0 ? "Ok" : "Fail";
    const result = change > 0 ? "Win" : "Lost";

    tme.sendMessage({
      chat_id: XBTTraderChatId,
      text: [
        "trade ended",
        `${strategyName}, ${symbolId}`,
        `bid : ${bid}`,
        `sell : ${ask}`,
        `change : ${change} [${targetStatus}]`,
        `trade result : *${result}*`
      ].join("\n")
    });
  }
  displayMessage(data) {
    const text = getMessageText(data);
    debug(text);
    tme.sendMessage({ chat_id: data.chat_id || MAXChatId, text });
  }
}();


bot.start();
