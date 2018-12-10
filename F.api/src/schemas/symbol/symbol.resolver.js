const { pubsub, SIGNAL_LOADED, KLINES } = require('../../gql')
const { subscribe, redisSet, redisGet } = require('common/redis')
const { withFilter } = require('apollo-server');
// const { candleUtils } = require('common');
// const { loadCandles } = candleUtils;
const resolvers = {


    Subscription: {
       
        symbolPerformance: {
            resolve: async ({ symbolPerformance }, { _ }, context, info) => {
                return symbolPerformance;
            },
            subscribe: () => pubsub.asyncIterator(["PERF"])
        }
    }
}

module.exports = { resolvers }
// subscribe('tv:signals', ({ timeframe, markets }) => {
//     pubsub.publish(SIGNAL_LOADED, { signalLoaded: { timeframe, markets: Object.values(markets) } })
// })
// subscribe('klines', (klines) => {
//     pubsub.publish(KLINES, { klines })
// })

subscribe('prevPerf', (symbolPerformance) => {
    pubsub.publish("PERF", { symbolPerformance })
})