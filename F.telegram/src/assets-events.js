const debug = require('debug')('F:assets-event');

const { newOrder, newTrade, orderExpiredOrCanceled, tradeChanged, endTrade } = require("./assets-messages");

module.exports = {
  'asset:buy:order_new': newOrder,
  'asset:buy:order_expired': orderExpiredOrCanceled,
  'asset:buy:order_canceled': orderExpiredOrCanceled,
  'asset:buy:success': newTrade,
  'asset:sell:order_new': function (data, channel) { },
  'asset:sell:success': endTrade,
  'asset:value_changed': tradeChanged,
}

