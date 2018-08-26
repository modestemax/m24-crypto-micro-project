
const { auth } = require("common");
const Binance = require("binance-api-node").default;
const client = Binance({ apiKey: auth.api_key, apiSecret: auth.secret });

module.exports = client;
