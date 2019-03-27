// @flow
//const QUOTE_ASSET="BTC";
// const QUOTE_ASSET_REGEX = /usd|pax/i;
const QUOTE_ASSET_REGEX = /btc$/i;
// const QUOTE_ASSET_REGEX = /bnb$/i;
// const QUOTE_ASSET="USDT";
const _ = require('lodash');
const { publishPerf, loadCandles, listenToPriceChange, changePercent } = require('./binance-utils')

const binance = require('./init-binance')
require('./progress/viewProgess')
const interval = '1m', limit = 60 * 24 + 10
//startup
binance.exchangeInfo(async function ex_info(error, data) {


    try {
        if (error) throw error

        const allSymbolsCandles = {}

        // const symbols = ['ETHBTC', 'ADABTC'];
        const binanceSymbols = data.symbols
            .filter(s => s.status === "TRADING")
            .filter(s => QUOTE_ASSET_REGEX.test(s.quoteAsset))
            .map(s => s.symbol);

        // const symbols = await binance.bookTickersAsync().then(tickers => {
        //     return _.filter(binanceSymbols, symbol => {
        //         const ticker = _.find(tickers, { symbol })
        //         return (ticker && changePercent(ticker.bidPrice, ticker.askPrice) < .6)
        //     })
        // })
        // if (error) process.nextTick(() => binance.exchangeInfo(ex_info))

        const symbols = await binance.prevDayAsync(false).then(response => {
            global.H24 = _.mapKeys(response, 'symbol')
            return _.filter(binanceSymbols, symbol => {
                const ticker = global.H24[symbol]
                return (ticker && changePercent(ticker.bidPrice, ticker.askPrice) < .6)
            })
        });
        publishPerf({ allSymbolsCandles, symbols });

        await (async function start(symbols) {
            const errors = [];
            for (const symbol of symbols) {
                try {
                    console.log(symbol, 'loading previous candles');
                    allSymbolsCandles[symbol] = await loadCandles(symbol, interval, limit);
                    listenToPriceChange({ candles: allSymbolsCandles[symbol], symbol, interval });
                    console.log(symbol + " candlestick started");
                } catch (e) {
                    console.log(symbol, e.message);
                    errors.push(symbol);
                }
            }
            setTimeout(() => start(errors), 30 * 1e3)
        }(symbols))
    } catch (error) {
        console.log(error);
        binance.exchangeInfo(ex_info)
    }


});

