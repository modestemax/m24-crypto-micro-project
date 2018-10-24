const { pubsub, SIGNAL_LOADED } = require('../gql')
const { subscribe } = require('common/redis')
const { withFilter } = require('apollo-server');

const resolvers = {

    
    Subscription: {
        signalLoaded: {
            // Additional event labels can be passed to asyncIterator creation
            subscribe: withFilter(
                () => pubsub.asyncIterator([SIGNAL_LOADED]),
                (payload, variables) => {
                    return payload.signalLoaded.timeframe === variables.timeframe;
                },
            ),
        },
    }
}

module.exports = { resolvers }

subscribe('tv:signals', ({ timeframe, markets }) => {
    pubsub.publish(SIGNAL_LOADED, { signalLoaded: { timeframe, markets: Object.values(markets) } })
})