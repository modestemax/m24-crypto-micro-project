const debug = require('debug')('B:strategy:bbema150-15M');

const M24Base = require('./m24Base');
const _ = require('lodash');
const { publish, subscribe, redisSet, redisGet } = require('common/redis');

const { candleUtils, saveDatum, exchange, humanizeDuration } = require("common");
const { computeChange, valuePercent } = candleUtils;

module.exports = class extends M24Base {

    constructor(...args) {
        super(...args)
        this.sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        this.ohlcv = {};
        this.start();
    }
    async start({  frame = '15m', limit = 10, minTarget = .3 } = {}) {
        this.started = false;
        await this.loadOHLCV({  frame, limit });
        this.findMaxRed();
        this.findMinMaxGreen();
        this.findMinGain();
        this.filterSelected(minTarget);
        this.started = true;
      //  debugger
    }
    filterSelected(n = 1) {
      return this.selected = _.reduce(this.ohlcv, (selected, { targetPercentage, symbolId }) => {
            return targetPercentage > n ? Object.assign(selected, { [symbolId]: this.ohlcv[symbolId] }) : selected;
        }, {})
    }
    findMinMaxGreen() {
        return this.ohlcv = _.mapValues(this.ohlcv, (ohlcv) => {
            const maxRedPercentage = ohlcv.maxRedPercentage;
            let dayChange = ohlcv.ohlcv.map(({ open, close, high }) => {
                let change = computeChange(open, high)
                if (open < close && change > maxRedPercentage) {
                    return change;
                }
            });
            let minGreenPercentage = _.min(dayChange);
            let maxGreenPercentage = _.max(dayChange);
            let enterPercentage = maxRedPercentage + 1;
            return Object.assign(ohlcv, {
                minGreenPercentage, maxGreenPercentage, enterPercentage,
                 targetPercentage: minGreenPercentage - enterPercentage
            })
        })
    }
    findMinGain() {
        return this.ohlcv = _.mapValues(this.ohlcv, (ohlcv) => {
            return Object.assign(ohlcv, {
                minGainPercentage: _.min(ohlcv.ohlcv.map(({ open, close, high }) => {
                    return computeChange(open, high);
                }))
            })
        })
    }
    findMaxRed() {
        return this.ohlcv = _.mapValues(this.ohlcv, (ohlcv) => {
            return Object.assign(ohlcv, {
                maxRedPercentage: _.max(ohlcv.ohlcv.map(({ open, close, high }) => {
                    if (open >= close) {
                        return computeChange(open, high);
                    }
                }))
            })
        })
    }
    async   loadOHLCV({  frame = '1d', limit = 10 } = {}) {
        let arrayToObject = ([timestamp, open, high, low, close, volume]) => ({ timestamp, open, high, close, low, volume });

        let markets = Object.entries(exchange.markets).filter(([symbol]) =>
            /BTC$/.test(symbol) && !/^BNB/.test(symbol));
        let ohlcv = await Promise.all(_.map(markets/*.slice(0, 3)*/, async ([symbol, { id: symbolId }]) => {
            // await this.sleep(exchange.rateLimit) // milliseconds
            let ohlcv = await exchange.fetchOHLCV(symbol,  frame, void 0, limit + 1) // one minute
            let now = arrayToObject(_.last(ohlcv));
            let last = arrayToObject(_.last(_.initial(ohlcv)));
            let timeframe = (now.timestamp - last.timestamp) / 1e3;
            let endTimeStamp = now.timestamp + timeframe * 1e3;
            return {
                symbolId, symbol, timeframe, endTimeStamp,
                ...now,frame,
                ohlcv: _.initial(ohlcv).map(arrayToObject)
            }
        }));

        this.ohlcv = ohlcv.reduce((ohlcv, { symbolId,...args }) => {
            return Object.assign(ohlcv, { [symbolId]: { symbolId, ...args} });
        }, {});
    }

    tick(price) {
        if (this.started) {
            const symbolId = price.info.symbol;
            const candle = this.selected[symbolId];
            if (candle) {
                candle.change = computeChange(candle.open, price.close);
                if (candle.change > candle.enterPercentage && Date.now < candle.endTimeStamp &&! candle.ok) {
                    candle.ok = true;
                    this.notifyOk(candle)
                } else {
                    candle.ok = false;
                }
            }
        }
    }

    notifyOk(candle) {
debugger
    }

};

