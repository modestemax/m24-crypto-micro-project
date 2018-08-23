const debug = require("debug")("F:telegram");
const _ = require('lodash');
const { valuePercent, saveTrade } = require("common");

const { bot, tme, M24_LOG_CHAT_ID, M24_CHAT_ID } = require('./bot');

const tradesMessageId = {};

const $this = module.exports = new class {

  constructor() {
    tme.sendMessage({
      chat_id: M24_CHAT_ID,
      text: [
        "Bot started ",
      ].join("\n")
    });
  }

  resetMessage() {
    tradesMessageId = {}
  }

  newOrder(order) {
    const { price: bid, symbolId, clientOrderId } = order;
    const strategy = clientOrderId.split("_")[0];

    tme.sendMessage({
      chat_id: M24_CHAT_ID,
      text: [
        "A new /order was posted",
        `${strategy}, ${symbolId} at ${bid}`
      ].join("\n")
    });
  }

  newTrade(trade) {
    const { price: bid, symbolId, target, trailling, stopLoss, clientOrderId } = trade;
    const strategyName = clientOrderId.split("_")[0];

    tradesMessageId = {};
    tme.sendMessage({
      chat_id: M24_CHAT_ID,
      text: [
        "A new /trade is running",
        `#${strategyName}, #${symbolId}`
      ].join("\n")
    });
  }

  async tradeChanged(trade) {
    const { symbolId, change, clientOrderId, maxChange, minChange } = trade;
    let message_id = tradesMessageId[clientOrderId];
    //--
    let strategy = trade.strategy = _.defaults(trade.strategy, { takeProfit: 3, stopLoss: -3, trailling: 2 })

    //--
    const strategyName = clientOrderId.split("_")[0];
    const targetStatus = change >= strategy.takeProfit ? "Success" : change > 0 ? "Ok" : "Fail";
    let msg = {
      chat_id: M24_CHAT_ID,
      message_id,
      text: [
        "trade changed",
        `#${strategyName}, #${symbolId}`,
        `max ${maxChange.toFixed(2)}% : min ${minChange.toFixed(2)}%`,
        `stop ${strategy.stopLoss} : profit ${strategy.takeProfit}`,
        `change : ${change.toFixed(2)}% [${targetStatus}]`
      ].join("\n")
    };
    if (!message_id) {
      let { message_id } = await tme.sendMessage(msg);
      tradesMessageId[clientOrderId] = message_id;
      //await saveTrade(trade);
    } else {
      await tme.editMessageText(msg);
    }
  }

  orderExpiredOrCanceled(order) {
    const { symbolId, clientOrderId } = order;
    const strategyName = clientOrderId.split("_")[0];
    tme.sendMessage({
      chat_id: M24_CHAT_ID,
      text: ["order expired/canceled", `#${strategyName}, #${symbolId}`].join("\n")
    });
  }

  endTrade(trade) {
    const { price: bid, ask, symbolId, change, target, clientOrderId } = trade;
    const strategyName = clientOrderId.split("_")[0];
    const targetStatus =
      change >= target ? "Success" : change > 0 ? "Ok" : "Fail";
    const result = change > 0 ? "Win" : "Lost";

    tme.sendMessage({
      chat_id: M24_CHAT_ID,
      text: [
        "trade ended",
        `${strategyName}, ${symbolId}`,
        // `bid : ${bid}`,
        // `sell : ${ask}`,
        // `change : ${change} [${targetStatus}]`,
        // `trade result : *${result}*`
      ].join("\n")
    });
  }

}();


bot.start();