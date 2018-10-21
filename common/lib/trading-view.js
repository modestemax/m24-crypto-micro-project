const debug = require('debug')('tv');
const curl = require('curl');
const _ = require('lodash');
const { getNewCandleId, getCandleTime, computeChange } = require('./candle-utils');

const params = ({ timeframe, filter = 'btc$', exchangeId = 'binance' } = {}) => {
    let timeframeFilter = !timeframe || /1d/i.test(timeframe) || +timeframe === 60 * 24 ? '' : '|' + timeframe;
    return {
        timeframe,
        data: {
            "filter": [
                { "left": "change" + timeframeFilter, "operation": "nempty" },
                { "left": "exchange", "operation": "equal", "right": exchangeId.toUpperCase() },
                { "left": "name,description", "operation": "match", "right": filter }
            ],
            "symbols": { "query": { "types": [] } },
            "columns": [
                "name"
                , "close" + timeframeFilter
                , "change" + timeframeFilter
                , "high" + timeframeFilter
                , "low" + timeframeFilter
                , "volume" + timeframeFilter
                , "Recommend.All" + timeframeFilter
                , "exchange"
                , "description"
                , "ADX" + timeframeFilter
                , "ADX-DI" + timeframeFilter
                , "ADX+DI" + timeframeFilter
                , "RSI" + timeframeFilter
                , "EMA10" + timeframeFilter
                , "EMA20" + timeframeFilter
                , "MACD.macd" + timeframeFilter
                , "MACD.signal" + timeframeFilter
                , "Aroon.Up" + timeframeFilter
                , "Aroon.Down" + timeframeFilter
                , "VWMA" + timeframeFilter
                , "open" + timeframeFilter
                , "change_from_open" + timeframeFilter
                , "Volatility.D"
                , "Stoch.K" + timeframeFilter
                , "Stoch.D" + timeframeFilter
                , "Stoch.RSI.K" + timeframeFilter
                , "Stoch.RSI.D" + timeframeFilter
                , "Mom" + timeframeFilter
                , "bid"
                , "ask"
                , "BB.lower" + timeframeFilter
                , "BB.upper" + timeframeFilter
                , "EMA200" + timeframeFilter
                , "EMA50" + timeframeFilter
                , "EMA100" + timeframeFilter
                , "EMA30" + timeframeFilter
            ],
            "sort": { "sortBy": "change" + timeframeFilter, "sortOrder": "desc" },
            "options": { "lang": "en" },
            "range": [0, 150]
        }
    }

};

const beautify = (data, timeframe) => {
    return _(data).map(({ d }) => {
        let id = getNewCandleId({ timeframe });
        const signal = {
            timeframe,
            symbolId: d[0],
            now: new Date(),
            time: getCandleTime({ id, timeframe }),
            id,
            close: d[1],
            change_percent: +d[2],
            change_from_open: +d[21],
            high: d[3],
            low: d[4],
            volume: d[5],
            rating: d[6],
            signal: getRatingText(d[6]),
            signal_strength: strength(d[6]),
            signal_string: signal_string(d[6]),
            exchange: d[7].toLowerCase(),
            description: d[8],
            ema10: d[13],
            ema20: d[14],
            adx: d[9],
            minus_di: d[10],
            plus_di: d[11],
            di_distance: d[11] - d[10],
            macd: d[15],
            macd_signal: d[16],
            macd_distance: d[15] - d[16],
            rsi: d[12],
            volatility: d[22],
            stochastic_k: d[23],
            stochastic_d: d[24],
            stochastic_rsik: d[25],
            stochastic_rsid: d[26],
            momentum: d[27],
            aroon_up: d[17],
            aroon_down: d[18],
            vwma: d[19],
            open: d[20],
            bid: d[28],
            ask: d[29],
            bbl20: d[30],
            bbu20: d[31],
            bbb20: (d[30] + d[31]) / 2,
            ema200: d[32],
            ema50: d[33],
            ema100: d[34],
            ema30: d[35],
        };
        return {
            ...signal,
            green: getRatingText.change_from_open > 0,
            spread_percentage: computeChange(getRatingText.bid, getRatingText.ask),
            change_to_high: computeChange(getRatingText.open, getRatingText.high)
        }
        function getRatingText(int) {
            switch (true) {
                case int > 0:
                    return 'buy';
                case int < 0:
                    return 'sell';
                default:
                    return 'neutral'
            }
        }

        function strength(int) {
            switch (true) {
                case int > .5:
                    return 1;
                case int < -.5:
                    return 1;
                default:
                    return 0
            }
        }

        function signal_string(int) {

            return (strength(int) === 1 ? 'Strong ' : '') + getRatingText(int)
        }
    }
    ).filter(d => d).groupBy('symbolId').mapValues(([v]) => v).value()
};

function getSignals({ options = params(), rate = 1e3 } = {}) {
    return new Promise((resolve, reject) => {
        const url = 'https://scanner.tradingview.com/crypto/scan';
        const { data, timeframe } = options;
        timeframe && debug(`loading signals for timeframe ${timeframe}`)
        curl.postJSON(url, data, (err, res, data) => {
            try {
                if (!err) {
                    let jsonData = JSON.parse(data);
                    if (jsonData.data && !jsonData.error) {
                        let beautifyData = beautify(jsonData.data, timeframe);
                        timeframe && debug(`signals ${timeframe} ${_.keys(beautifyData).length} symbols loaded`);

                        let beautifyData1 = _.mapKeys(_.orderBy(beautifyData, 'change_from_open', 'desc')
                            .map((a, i) => ({ position: ++i, ...a })), a => a.symbolId)

                        let beautifyData2 = _.mapKeys(_.orderBy(_.filter(beautifyData1, a => a.spread_percentage < 1), 'change_from_open', 'desc')
                            .map((a, i) => ({ position_good_spread: ++i, ...a })), a => a.symbolId)

                        resolve({ ...beautifyData1, ...beautifyData2 });
                    }
                    err = jsonData.error;
                }
                err && reject(err)
            } catch (ex) {
                reject(ex);
                debug(ex)
            } finally {
            }
        })
    })
}

module.exports = function ({ timeframe, filter, exchangeId }) {
    // console.log('loading data timeframe',timeframe,new Date())
    return getSignals({ options: params({ timeframe, filter, exchangeId }) })
}