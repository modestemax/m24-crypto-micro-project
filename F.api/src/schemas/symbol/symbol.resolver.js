const { pubsub, SIGNAL_LOADED } = require('../../gql')
const { subscribe } = require('common/redis')
const { withFilter } = require('apollo-server');

const resolvers = {


    Subscription: {
        signalLoaded: {
            resolve: ({ signalLoaded }, { position_min, timeframe }, context, info) => {
                // Manipulate and return the new value
                //    return payload.signalLoaded;
                // debugger
                if (timeframe && signalLoaded.timeframe == timeframe) {
                    return { ...signalLoaded, markets: signalLoaded.markets.filter(m => (m.position_good_spread && m.position_good_spread <= (position_min || -Infinity))) }
                }

                return {
                    ...signalLoaded,
                    markets: !position_min ? signalLoaded.markets
                        : signalLoaded.markets.filter(m => m.position_good_spread <= position_min)
                }

            },
            // Additional event labels can be passed to asyncIterator creation
            subscribe: withFilter(
                () => pubsub.asyncIterator([SIGNAL_LOADED]),
                (payload, { timeframe }) => {
                    // debugger
                    return true;
                    // return payload.signalLoaded.timeframe === timeframe;
                },
            ),
        },
    }
}

module.exports = { resolvers }

subscribe('tv:signals', ({ timeframe, markets }) => {
    pubsub.publish(SIGNAL_LOADED, { signalLoaded: { timeframe, markets: Object.values(markets) } })
})