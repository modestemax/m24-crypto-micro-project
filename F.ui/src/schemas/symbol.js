const {gql}=require('apollo-server')

const typeDefs=gql`
type Symbol  {
    # id:Int
    # baseId:String
    # quoteId:String
    symbolId:String
    # open:Float!
    # close:Float!
    # low:Float!
    # high:Float!
    # change_from_open:Float!
    # change_to_high:Float!
    # timeframe:Int!
    # position:Int!
    position_good_spread:Int
    # spread_percentage:Float!
}
type Query {
    signals:[Symbol!]!
}
type Market{
    timeframe:Int
    market:[Symbol]
}
type Subscription{
    signalLoaded:Market!
}
`

module.exports={typeDefs}