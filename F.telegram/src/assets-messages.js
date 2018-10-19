const debug = require("debug")("F:telegram");
const _ = require('lodash');
const { computeChange, valuePercent, saveTrade, humanizeDuration } = require("common");

const { bot, tme, M24_LOG_CHAT_ID, M24_CHAT_ID } = require('./bot');
const WIN = "❤️";
const LOST = "😭"
const SUCCESS = "👌🏼";
const WINNING = "👍🏻";
const LOOSING = "👎🏽";
const ONE_MINUTE = 1e3 * 60;

const tradesMessageId = {};

const $this = module.exports = new class {

  constructor() {
    tme.sendMessage({
      chat_id: M24_CHAT_ID,
      text: [
        "Bot started ",
      ].join("\n")
    });
    setTimeout(this.resetMessage.bind(this), ONE_MINUTE * 10)
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
    let { symbolId, change, openPrice, closePrice, clientOrderId, timestamp, maxChange, minChange } = trade;
    openPrice = +openPrice || 0;
    closePrice = +closePrice || 0;
    change = +change || 0;
    maxChange = +maxChange || 0;
    minChange = +minChange || 0;


    //--
    let strategy = trade.strategy = _.defaults(trade.strategy, { takeProfit: 3, stopLoss: -3, trailling: 2 })
    let duration = Date.now() - timestamp;
    //--
    const strategyName = clientOrderId.split("_")[0];

    const targetStatus = change >= strategy.takeProfit ? SUCCESS :
      change > .15 ? WINNING : change < .15 ? LOOSING : "?";
    let msg = {
      chat_id: M24_CHAT_ID,
      message_id: tradesMessageId[clientOrderId],
      text: [
        "💎 #trade_changed",
        `#${strategyName}, #${symbolId}`,
        `max ${maxChange.toFixed(2)}% : min ${minChange.toFixed(2)}%`,
        `stop ${strategy.stopLoss} : profit ${strategy.takeProfit}`,
        `change  ${change.toFixed(2)}% [${targetStatus}]`,
        `open: ${openPrice.toFixed(8)}`,
        `close: ${closePrice.toFixed(8)} `,
        `hope: ${valuePercent(openPrice, strategy.takeProfit).toFixed(8)} `,
        `since ${humanizeDuration(duration)}`,
        ` type [/sell ${symbolId}] to sell at market price`
      ].join("\n")
    };
    if (!tradesMessageId[clientOrderId]) {
      tradesMessageId[clientOrderId] = tme.sendMessage(msg);
      tradesMessageId[clientOrderId].then(
        ({ message_id }) => tradesMessageId[clientOrderId] = message_id,
        () => delete tradesMessageId[clientOrderId]
      );
      //await saveTrade(trade);
    } else if (+tradesMessageId[clientOrderId]) {
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
    const M1 = 1e3 * 60;
    duration > M1 && tme.sendMessage({
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
    const [result, resultText] = change > 0.15 ? [WIN, 'win'] : change < 0.15 ? [LOST, 'lost'] : ["?", 'unknow'];

    tme.sendMessage({
      chat_id: M24_CHAT_ID,
      text: [
        "🔓 #trade_ended " + result,
        `#${strategyName}, #${symbolId}`,
        `bid : ${openPrice || '?'}`,
        `sell : ${closePrice || '?'}`,
        `change : ${change ? change.toFixed(2) : '?'}`,
        `duration ${humanizeDuration(duration)}`,
        `${result} #${resultText}`
      ].join("\n")
    });
  }

}();


bot.start();
