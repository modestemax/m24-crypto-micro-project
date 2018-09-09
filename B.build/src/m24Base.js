const debug = require('debug')('B:strategy:emah1h4');
const _ = require('lodash');
const Template = require('./strategyBase');

const { subscribe, publish, redisGet, redisSet, } = require("common/redis");
const { candleUtils, exchange, humanizeDuration, fetchTickers } = require("common");
const { computeChange, valuePercent } = candleUtils;

const redisSetThrottled = _.throttle(redisSet, 60 * 1e3);

module.exports = class extends Template {
    constructor(options) {
        super(options);
        this.last=this.last||{};
        this.prev=this.prev||{};
        this.track24H()
        subscribe('m24:algo:get_top5', (...args) => this.logTop5(null, ...args))
    }
    test(m24, BREAK_CHANGE = 3) {

    }
    tick(price) {

    }
    async track24H() {
        const logTop5Throttled=_.throttle(()=> this.logTop5(), process.env.NODE_ENV === 'production' ? 10 * 60e3 : 30e3);
        this.startTime = Date.now();
        this.assets = (await redisGet('assets'));
        fetchTickers((price, assets) => {
            if (!this.assets) {
                this.assets = _.cloneDeep(assets);
                _.forEach(this.assets, (asset) => this.initAsset(asset))
            }
            this.assetChanged(this.assets[price.symbol], price);
            this.tick(price)
            redisSetThrottled({ key: 'assets', data: this.assets, expire: 60 * 20 })//20 min
            logTop5Throttled()
        })
               
    }
    getTop(count = 5, assets) {
        assets = assets || this.assets;
        const top = _(assets)
            .map('m24')
            .filter(m24 => this.test(m24, 0, 0))
            .orderBy(m24 => m24.change).reverse().slice(0, count)
            .map(m24 => ({
                symbolId: m24.symbolId,
                change: m24.change.toFixed(2),
                minChange: m24.minChange.toFixed(2),
                duration: m24.duration
            }))
            .value();
        return top;
    }
    logTop5(assets, options) {
        assets = assets || this.assets;
        let top5 = this.getTop(5, assets);

        if (top5.length) {
            this.StrategyLog(top5.map(t => `#${t.symbolId} ${t.change} [min: ${t.minChange}] [ since ${humanizeDuration(t.duration)} ]`).join('\n'),
                options);
            console.log("top5", this.name)
            top5.map(t => `${t.symbolId} ${t.change} [${t.minChange}]  since ${humanizeDuration(t.duration)}`).map(str => console.log(str))
        } else {
            // this.StrategyLog(assets ? 'Empty' : 'assets is undefined', options)
        }

    }
    initAsset(asset, newAsset, { minChange = 0 } = {}) {
        const now = Date.now();
        const goodAsset = newAsset || asset;
        const m24 = {
            symbolId: asset.info.symbol,
            symbol: asset.symbol,
            change: 0,
            percentage: goodAsset.percentage,
            lastQuoteVolume: goodAsset.quoteVolume,
            time: now,
            upCount: 0, downCount: 0, minChange
        };
        _.extend(asset, { m24 }, newAsset)
    }
    assetChanged(asset, newAsset) {
        if (/\/BTC/.test(asset.symbol)) {
            const { symbol, m24 } = asset;
            const now = Date.now();

            m24.prevPercentage = m24.percentage;
            Object.assign(m24, _.pick(newAsset, [
                'bid', 'ask', 'high', 'low', 'open',
                'close', 'previousClose', 'percentage'
            ]));
            m24.lastQuoteVolume = newAsset.quoteVolume;
            m24.highPercentage = _.max([m24.percentage, m24.highPercentage]);

            m24.duration = now - m24.time;
            m24.prevChange = m24.change;
            m24.change = computeChange(asset.close, newAsset.close);
            m24.maxChange = _.max([m24.change, m24.maxChange]);                                
           // m24.adx=[_.last(m24.adx),_.last(_.initial(m24.adx)),this.prev.adx,this.last.adx]
          //  m24.change >0 && console.log( this.getTop())
            
            m24.instantDelta = Math.abs(m24.change - m24.prevChange);
            m24.maxInstantDelta = _.max([m24.instantDelta, m24.maxInstantDelta]);

            m24.delta = m24.delta ? (m24.delta + m24.instantDelta) / 2 : m24.instantDelta;

            m24.upCount += m24.instantDelta > 0;
            m24.downCount += m24.instantDelta < 0;
            m24.growingUpSmoothly = m24.upCount >= 2 && m24.upCount > m24.downCount;
            m24.askVolumeBTC = newAsset.askVolume * newAsset.ask;
            m24.bidVolumeBTC = newAsset.bidVolume * newAsset.bid;
            m24.volumeRatio = m24.bidVolumeBTC / newAsset.quoteVolume * 100
            m24.spreadPercent = computeChange(asset.bid, asset.ask);
            const { bid, delta, change,minChange, duration, highPercentage, percentage } = m24;
            if (this.test(m24)) {//quantité de bid relativement petite
                {//1heure
                    // m24.openPrice = m24.openPrice || this.getOpenPrice(m24);
                    m24.openPrice =  this.getOpenPrice(m24);
                    // this.logTop5();
                    console.log(new Date(now),this.name+' '+ symbol + ' ' + m24.bid + ' [' + m24.openPrice.toFixed(8) + '] ' + change.toFixed(2) + '%/'+ minChange.toFixed(2) + '%', ' since ' + humanizeDuration(duration));
                    this.buy(asset);
                    //  this.initAsset(asset, newAsset);
                }
            }

            this.tryReset(asset, newAsset)
        }
    }
    async canBuy({ symbolId, timeframe }, last, prev, signalH4, asset) { 
      //  debugger      
        this.last[symbolId]=last;
        this.prev[symbolId]=prev;
    }
    tryReset(asset, newAsset) {
        const { bid, delta, change, maxChange,minChange,  maxInstantDelta, duration, highPercentage, percentage } = asset.m24;

        if (change < 0 || maxChange - change > 3/* ||
        maxInstantDelta > 1 || duration > 1e3 * 60 * 60 * 6*/) {
            let min = _.sum([change, minChange]);
            this.initAsset(asset, newAsset, { minChange:min });
        }
    }
    getOpenPrice(m24) {
        const { bid, delta } = m24;
        return bid - (delta * bid / 100) / 2
    }
    buy(asset) {
        let { symbolId, openPrice } = asset.m24;
        Object.assign(this, { symbolId, bid: openPrice });
        this.notifyBuy();
    }

    getSellPriceIfSellable(asset) {

    }
};

//-------V 00----------------------------------------
/*
  assetChanged(asset, newAsset) {
        if (/\/BTC/.test(asset.symbol)) {
            const { symbol, m24 } = asset;            
            const now = Date.now();

            m24.bid = newAsset.bid;
            m24.duration = now - m24.time;
            m24.prevChange = m24.change;
            m24.change = computeChange(asset.close, newAsset.close);
            m24.maxChange = _.max([m24.change, m24.maxChange]);

            m24.instantDelta = Math.abs(m24.change - m24.prevChange);
            m24.maxInstantDelta = _.max([m24.instantDelta, m24.maxInstantDelta]);

            m24.delta = m24.delta ? (m24.delta + m24.instantDelta) / 2 : m24.instantDelta;

            m24.upCount += m24.delta > 0;
            m24.downCount += m24.delta < 0;
            m24.growingUpSmoothly = m24.upCount > 2 && m24.upCount > m24.downCount;
            m24.bidVolumeBTC = newAsset.bidVolume * newAsset.bid;
            m24.volumeRatio = m24.bidVolumeBTC / newAsset.quoteVolume * 100

            const { change, maxInstantDelta, delta, growingUpSmoothly, volumeRatio, bidVolumeBTC, duration } = m24;
           
            // console.log('#'+symbol, change);

            const BREAK_CHANGE = 3;
            if (change > BREAK_CHANGE) {//faire aumoins 3% 
                if (newAsset.percentage > 2) //ne pas toucher a ceux qui sont descendant
                    // if (asset.percentage < 15) //ne pas toucher a ceux qui sont dejà assez monté
                    if (delta < .5) //if (delta < .5) //se rassurer des petits pas entre les variations
                        if (maxInstantDelta < 1)//pas de hause/chute (pique) brusque
                            if (growingUpSmoothly)//monté progressive
                                if (newAsset.quoteVolume > 40 && bidVolumeBTC < 1)//assez bon volume 24H
                                    if (volumeRatio < 10) {//quantité de bid relativement petite
                                        console.log(new Date(now), symbol, m24.bid, change.toFixed(2), '%', 'Duration', duration / (1e3 * 60), 'min');
                                        this.buy(asset);
                                        this.initAsset(asset, newAsset);
                                    }
            }
            if (change < -1 || newAsset.percentage < 2 || delta > .5 || maxInstantDelta > 1) {
                this.initAsset(asset, newAsset);
            }
        }
    }
 */
//-----------------------------------------------------