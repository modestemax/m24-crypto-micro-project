const debug = require("debug")("F:telegram");
const _ = require('lodash');
const { computeChange, valuePercent, saveTrade, humanizeDuration } = require("common");

const { bot, tme, M24_LOG_CHAT_ID, M24_CHAT_ID } = require('./bot');
const WIN = "❤️";
const LOST = "😭"
const SUCCESS = "👌🏼";
const WINNING = "👍🏻";
const LOOSING = "👎🏽";
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
    Object.keys(tradesMessageId).forEach(k => delete tradesMessageId[k])
  }
  estimatedBalanceChanged({ text }) {
    tme.sendMessage({
      chat_id: M24_CHAT_ID,
      text: [
        "#estimated_balance",
        text
      ].join("\n")
    });
  }
  newOrder(order) {
    const { price: bid, symbolId, clientOrderId } = order;
    const strategyName = clientOrderId.split("_")[0];

    tme.sendMessage({
      chat_id: M24_CHAT_ID,
      text: [
        "#new_order was posted",
        `${strategyName}, ${symbolId} at ${bid}`
      ].join("\n")
    });
  }

  newTrade(trade) {
    const { price: bid, symbolId, target, trailling, stopLoss, clientOrderId } = trade;
    const strategyName = clientOrderId.split("_")[0];

    tme.sendMessage({
      chat_id: M24_CHAT_ID,
      text: [
        "#new_trade is running",
        `#${strategyName}, #${symbolId} at ${bid}`
      ].join("\n")
    });
  }

  async tradeChanged(trade) {
    const { symbolId, change, clientOrderId, timestamp, maxChange, minChange } = trade;
    let message_id = tradesMessageId[clientOrderId];
    //--
    let strategy = trade.strategy = _.defaults(trade.strategy, { takeProfit: 3, stopLoss: -3, trailling: 2 })
    let duration = Date.now() - timestamp;
    //--
    const strategyName = clientOrderId.split("_")[0];

    const targetStatus = change >= strategy.takeProfit ? SUCCESS :
      change > .15 ? WINNING : change < .15 ? LOOSING : "?";
    let msg = {
      chat_id: M24_CHAT_ID,
      message_id,
      text: [
        "💎 #trade_changed",
        `#${strategyName}, #${symbolId}`,
        `max ${maxChange.toFixed(2)}% : min ${minChange.toFixed(2)}%`,
        `stop ${strategy.stopLoss} : profit ${strategy.takeProfit}`,
        `change  ${change.toFixed(2)}% [${targetStatus}]`,
        `since ${humanizeDuration(duration)}`,
        `/sell`
      ].join("\n")
    };
    if (!message_id) {
      ({ message_id } = await tme.sendMessage(msg));
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
      text: ["#order_expired_canceled", `#${strategyName}, #${symbolId}`].join("\n")
    });
  }
  tradeForgotten({ clientOrderId, symbolId, timestamp, openPrice, closePrice, quantity }) {
    clientOrderId = clientOrderId || 'UNKNOWN';
    let duration = Date.now() - timestamp;
    let change = computeChange(openPrice, closePrice);
    const strategyName = clientOrderId.split("_")[0];
    tme.sendMessage({
      chat_id: M24_CHAT_ID,
      text: ["#trade_forgotten",
        `#${strategyName}, #${symbolId}`,
        `change: ${change} `,
        ` since ${humanizeDuration(duration)} `].join("\n")
    });
  }

  endTrade(trade) {
    let { openPrice, closePrice, symbolId, change, timestamp, clientOrderId } = trade;
    const strategyName = clientOrderId.split("_")[0];
    if (openPrice && closePrice) {
      change = computeChange(openPrice, closePrice);
    }
    let duration = Date.now() - timestamp;
    const result = change > 0.15 ? WIN : change < 0.15 ? LOST : "?";

    tme.sendMessage({
      chat_id: M24_CHAT_ID,
      text: [
        "🔓 #trade_ended",
        `#${strategyName}, #${symbolId}`,
        `bid : ${openPrice || '?'}`,
        `sell : ${closePrice || '?'}`,
        `change : ${change ? change.toFixed(2) : '?'}`,
        `duration ${humanizeDuration(duration)}`,
        `${result}`
      ].join("\n")
    });
  }

}();


bot.start();
