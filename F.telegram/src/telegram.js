const debug = require("debug")("F:telegram");
const { valuePercent, saveTrade } = require("common");

const { bot, tme, MAXChatId, XBTTraderChatId } = require('./bot');
const getMessageText = require('./message-builder');


const $this = module.exports = new class {

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

  async tradeChanged(trade) {
    const { symbolId, change, strategy, newClientOrderId, maxChange, minChange } = trade;
    $this.tradeChanged[newClientOrderId] = $this.tradeChanged[newClientOrderId] || {};

    const strategyName = newClientOrderId.split("_")[0];
    const targetStatus =
      change >= strategy.takeProfit ? "Success" : change > 0 ? "Ok" : "Fail";
    let message_id = $this.tradeChanged[newClientOrderId].message_id = trade.message_id || $this.tradeChanged[newClientOrderId].message_id;
    let msg = {
      chat_id: XBTTraderChatId,
      message_id,
      text: [
        "trade changed",
        `${strategyName}, ${symbolId}`,
        `max ${maxChange.toFixed(2)}% : min ${minChange.toFixed(2)}%`,
        `stop ${strategy.stopLoss} : profit ${strategy.takeProfit}`,
        `change : ${change.toFixed(2)}% [${targetStatus}]`
      ].join("\n")
    };
    if (!message_id) {
      let { message_id } = await tme.sendMessage(msg);
      trade.message_id = $this.tradeChanged[newClientOrderId].message_id = message_id;
      await saveTrade(trade);
    } else {
      await tme.editMessageText(msg);
    }
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
