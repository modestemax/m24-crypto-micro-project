// @flow
//const QUOTE_ASSET="BTC";
// const QUOTE_ASSET_REGEX = /usd|pax/i;
const QUOTE_ASSET_REGEX = /btc$/i;
// const QUOTE_ASSET="USDT";
const _ = require('lodash');
const { publishPerf, loadCandles, listenToPriceChange } = require('./binance-utils')

const binance = require('./init-binance')
//startup
binance.exchangeInfo(async function ex_info(error, data) {

    if (error) {
        console.log(error);
        binance.exchangeInfo(ex_info)
    } else {
        const symbols = []
        const allSymbolsCandles = {}

        // const symbols = ['ETHBTC', 'ADABTC'];
        symbols.push.apply(symbols, data.symbols
            .filter(s => s.status === "TRADING")
            .filter(s => QUOTE_ASSET_REGEX.test(s.quoteAsset))
            .map(s => s.symbol));

        publishPerf(allSymbolsCandles);

        (async function start(symbols) {
            const errors = [];
            for (const symbol of symbols) {
                try {
                    console.log(symbol, 'loading previous candles');
                    allSymbolsCandles[symbol] = await loadCandles(symbol);
                    listenToPriceChange({ candles: allSymbolsCandles[symbol], symbol });
                    console.log(symbol + " candlestick started");
                } catch (e) {
                    console.log(symbol, e.message);
                    errors.push(symbol);
                }
            }
            setTimeout(() => start(errors), 30 * 1e3)
        }(symbols))
    }
});

