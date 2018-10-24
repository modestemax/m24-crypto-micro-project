const {pubsub,SIGNAL_LOADED}=require('../gql')
const {subscribe}=require('common/redis')

const resolvers = {
    Subscription: {
        signalLoaded: {
            // Additional event labels can be passed to asyncIterator creation
            subscribe: () => pubsub.asyncIterator([SIGNAL_LOADED]),
        },
    }
}

module.exports={resolvers}

subscribe('tv:signals',({timeframe,markets})=>{
    pubsub.publish(SIGNAL_LOADED,{signalLoaded:{timeframe,markets:Object.values(markets)}})
})