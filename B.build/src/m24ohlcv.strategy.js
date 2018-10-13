const debug = require('debug')('B:strategy:bbema150-15M');

const M24Base = require('./m24Base');
const _ = require('lodash');
const { publish, subscribe, redisSet, redisGet } = require('common/redis');

const { candleUtils, saveDatum, exchange, humanizeDuration } = require("common");
const { computeChange, valuePercent } = candleUtils;
const Mutex = new require("await-mutex").default;
const mutex = new Mutex();

module.exports = class extends M24Base {

    constructor(...args) {
        super(...args)
        this.sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
         this.start();
    }
    async start() {
        let unlock = await mutex.lock();
        this.StrategyLog(`Loading OHLCV for ${this.options.frame} `);
        try {
            let { frame, limit, minTarget, maxSpread } = Object.assign({ frame: '1d', limit: 10, minTarget: 5, maxSpread: 1 }, this.options)
            // this.started = false;
            await this.loadOHLCV({ frame, limit });
            this.StrategyLog(`Loaded OHLCV for ${this.options.frame} `);
            //-----------------
            // this.findMaxRed();
            // this.findMinMaxGreen();
            // this.findMinGain(minTarget);
            // this.filterSelected(minTarget);
            //-----------------
            this.findMinChange({ minTarget, maxSpread })
            this.beginBid();
            this.restart();
            //--------------------
            // this.log();
            // this.started = true;
        } finally {
            unlock();
        }
        //  debugger
    }
    log() {
        console.log(`OHLCV selected symbol timeframe:${this.options.frame} target:${this.options.minTarget}% `)
        // console.log(Object.keys(this.selected));
        // this.StrategyLog(`Selected symbol for timeframe: ${this.options.frame}\n`
        //     + `target: ${this.options.minTarget}%\n`
        //     + _.map(this.selected, s =>
        //         `${s.symbolId}   bid if change>= ${s.enterPercentage.toFixed(2)}%`).join('\n')
        // );
    }

    filterSelected(n = 1) {
        return this.selected = _.reduce(this.symbols, (selected, { targetPercentage, symbolId }) => {
            return targetPercentage >= n ? Object.assign(selected, { [symbolId]: this.symbols[symbolId] }) : selected;
        }, {})
    }
    restart() {
        const eth = this.symbols['ETHBTC']
        let int = setInterval(() => {
            if (Date.now() >= eth.endTimeStamp) {
                clearInterval(int);
                showStatus()
                this.start();
            }
        }, 1e3)
        function showStatus() {
            this.winners.length && this.StrategyLog(
                `trades results ->: ${this.options.minTarget}%.`
                + `timeframe:${this.options.frame} \n`
                + `#ohlcv_ok_` + this.options.frame + '\n'
                + _(this.winners).filter(s => computeChange(s.open, s.high) > this.options.minTarget)
                    .map(s => `${s.symbolId}`).value().join('\n')
                + `#ohlcv_nok_` + this.options.frame + '\n'
                + _(this.winners).filter(s => computeChange(s.open, s.high) <= this.options.minTarget)
                    .map(s => `${s.symbolId}`).value().join('\n')
            );
        }
    }
    beginBid() {
        //only bid if open=high
        this.winners.length && this.StrategyLog(
            `theses symbols will perform at least: ${this.options.minTarget}% in current candle.`
            + `timeframe:${this.options.frame} \n`
            + `#ohlcv_` + this.options.frame + '\n'
            + _.map(this.winners, s =>
                `${s.symbolId}`).join('\n')
        );
        this.winners.length || this.StrategyLog(`no symbols will perform at least: ${this.options.minTarget} in current candle.timeframe:${this.options.frame}`)
    }

    findMinChange({ minTarget, maxSpread }) {

        let symbols = _.mapValues(this.symbols, (symbolData) => {
            let candlesMaxChanges = symbolData.ohlcv.map(({ open, close, high }) => computeChange(open, high));
            const epsi = 0//.5
            const lastCandle = _.last(symbolData.ohlcv);
            const ticker = this.tickers[symbolData.symbol];
            return Object.assign(symbolData, {
                minPercentage: _.min(candlesMaxChanges),
                maxPercentage: _.max(candlesMaxChanges),
                meanPercentage: _.mean(candlesMaxChanges),
                currentPercentage: computeChange(symbolData.open, symbolData.high),
                lastCandleIsGreen: lastCandle.open < lastCandle.close,
                spread: ticker && computeChange(ticker.bid, ticker.ask)
            })
        });
        this.winners = _(symbols).filter(a => a.minPercentage > (minTarget /*+ 2 * a.spread*/) && a.spread < maxSpread).orderBy('minPercentage', 'desc').value()
    }
    findMinMaxGreen() {
        return this.symbols = _.mapValues(this.symbols, (symbolData) => {
            const maxRedPercentage = symbolData.maxRedPercentage;
            let dayChange = symbolData.ohlcv.map(({ open, close, high }) => {
                let change = computeChange(open, high)
                if (open < close && change > maxRedPercentage) {
                    return change;
                }
            });
            const epsi = 0//.5
            let minGreenPercentage = _.min(dayChange);
            let maxGreenPercentage = _.max(dayChange);
            let enterPercentage = maxRedPercentage + epsi;
            return Object.assign(symbolData, {
                minGreenPercentage, maxGreenPercentage, enterPercentage,
                targetPercentage: minGreenPercentage - enterPercentage
            })
        })
    }
    findMinGain(n = 1) {
        this.selectedMinGain = {};
        return this.symbols = _.mapValues(this.symbols, (symbolData) => {
            let minGainPercentage = _.min(symbolData.ohlcv.map(({ open, close, high }) => {
                return computeChange(open, high);
            }));
            if (minGainPercentage >= n) {
                this.selectedMinGain[symbolData.symbolId] = symbolData;
            }
            return Object.assign(symbolData, { minGainPercentage })
        })
    }
    findMaxRed() {
        return this.symbols = _.mapValues(this.symbols, (symbolData) => {
            return Object.assign(symbolData, {
                maxRedPercentage: _.max(symbolData.ohlcv.map(({ open, close, high }) => {
                    if (open >= close) {
                        return computeChange(open, high);
                    }
                }))
            })
        })
    }
    async   loadOHLCV({ frame = '1d', limit = 10 } = {}) {
        let arrayToObject = ([timestamp, open, high, low, close, volume]) => ({ timestamp, open, high, close, low, volume });
        if (this.symbols) {
            limit = 1
        }
        console.log(`loading last ${limit} OHLCV for timeframe ${this.options.frame} `)

        let markets = Object.entries(exchange.markets).filter(([symbol]) =>
            /BTC$/.test(symbol) && !/^BNB/.test(symbol));
        let symbols = await Promise.all(_.map(markets/*.slice(0, 3)*/, async ([symbol, { id: symbolId }]) => {
            // await this.sleep(exchange.rateLimit) // milliseconds
            let ohlcv = await exchange.fetchOHLCV(symbol, frame, void 0, limit + 1) // one minute
            let now = arrayToObject(_.last(ohlcv));
            let last = arrayToObject(_.last(_.initial(ohlcv)));
            let timeframe = (now.timestamp - last.timestamp) / 1e3;
            let endTimeStamp = now.timestamp + timeframe * 1e3;
            let prevOHLCV = [];
            if (this.symbols && this.symbols[symbolId]) {
                prevOHLCV = _.tail(this.symbols[symbolId].ohlcv);
            }
            return {
                symbolId, symbol, timeframe, endTimeStamp,
                ...now, frame,
                ohlcv: prevOHLCV.concat(_.initial(ohlcv).map(arrayToObject))
            }
        }));

        this.symbols = symbols.reduce((symbols, { symbolId, ...args }) => {
            return Object.assign(symbols, { [symbolId]: { symbolId, ...args } });
        }, {});
    }

    tick(price) {
        if (!this.started) {
            this.started = true;
            this.start();
        }
        //   this.tickers[price.info.symbol] = price;
        // if (this.started) {
        //     const symbolId = price.info.symbol;
        //     const candle = this.symbols[symbolId];
        //     if (candle) {
        //         candle.change = computeChange(candle.open, candle.close = price.close);
        //         this.checkWhenToBid(candle);
        //         this.checkIfMinTargetPerformedIfBidInTheBeginingOfTimeframe(price);
        //     }
        // }
    }

    checkWhenToBid({ symbolId, close }) {
        const selected = this.selected[symbolId];
        if (selected) {
            if (!selected.ok)
                if (selected.change > selected.enterPercentage)
                    if (Date.now < selected.endTimeStamp) {
                        selected.ok = true;
                        selected.ask = close;
                        this.notifyOk(selected)
                    } else {
                        this.start();
                    }
        }
    }
    notifyOk(candle) {
        this.StrategyLog(`#ohlcv  ${candle.symbolId} `);
        this.symbolId = candle.symbolId;
        this.timeframe = candle.timeframe;
        this.ask = candle.ask;
        this.notifyBuy();
    }
    checkIfMinTargetPerformedIfBidInTheBeginingOfTimeframe({ symbolId, close }) {

        const selected = this.selectedMinGain[symbolId];
        if (selected) {
            if (!selected.ok)
                if (selected.change > selected.minGainPercentage)
                    if (Date.now < selected.endTimeStamp) {
                        selected.ok = true;
                        selected.ask = close;
                    } else {
                        displayResume();
                        this.start();
                    }
        }
        function displayResume() {
            let ok = [], nok = [];
            for (let [symbolId, candle] in this.selectedMinGain) {
                if (candle.ok) {
                    ok.push(`si tu avais buy ${symbolId} au debut de la bougie ${candle.frame} tu aurais gagné ${this.options.minTarget} `)
                } else {
                    ok.push(`si tu avais buy ${symbolId} au debut de la bougie ${candle.frame} tu aurais perdu} `)
                }
            }
            this.StrategyLog(ok.join('\n'));
            this.StrategyLog(nok.join('\n'));
        }
    }
}