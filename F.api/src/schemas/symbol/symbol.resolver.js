const { pubsub, SIGNAL_LOADED } = require('../../gql')
const { subscribe, redisSet, redisGet } = require('common/redis')
const { withFilter } = require('apollo-server');
const { candleUtils } = require('common');
const {loadCandles} = candleUtils;
const resolvers = {


    Subscription: {
        signalLoaded1: {
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
        signalLoaded: {
            resolve:async ({ signalLoaded }, {  timeframes }, context, info) => {
                // Manipulate and return the new value
                //    return payload.signalLoaded;
                
               process.nextTick(async()=>{
                let prev=signalLoaded.position?signalLoaded.position+1:1;
                
                let timeframe=signalLoaded.timeframe;
                    if (timeframes.includes(timeframe + '-' + prev)) {
                        let signals =await redisGet('tv:signals:' + timeframe + ':' + (signalLoaded.markets[0].id - prev));
                        signals&&  console.log(timeframe,prev,signals[0].symbolId,signals[0].id,signalLoaded.markets[0].id)
                        signals && pubsub.publish(SIGNAL_LOADED, {
                            signalLoaded: {
                                timeframe,
                                position:prev,
                                markets: signals
                            }
                        })
                    }            
                }); 
                //return {...signalLoaded,markets:[signalLoaded.markets[0]]}
                return {
                    ...signalLoaded,
                    markets: signalLoaded.markets.filter(m => m.position_good_spread)
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