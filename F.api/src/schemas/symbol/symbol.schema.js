const {gql}=require('apollo-server')

const typeDefs=gql`
type Symbol  {
    # id:Int
    # baseId:String
    # quoteId:String
    symbolId:String!
    open:Float!
    close:Float!
    low:Float!
    high:Float!
    change_from_open:Float!
    change_to_high:Float!
    timeframe:Int!
    position:Int!
    position_good_spread:Int
    spread_percentage:Float!
}
enum Interval { m1 m3 m5 m15 m30 h1 h2 h4 h6 h8 h12 d1 d3}

type Kline{
    symbolId:String!
    open:Float!
    close:Float!
    low:Float!
    high:Float!
    change_from_open:Float!
    change_to_high:Float!
    interval:String!
    position:Int!
}

type Query {
    signals:[Symbol!]!
}
type Market{
    timeframe:Int!
    position:Int
    markets:[Symbol]
}
type Subscription{
    signalLoaded1(timeframe:Int,position_min:Int):Market!
    signalLoaded(timeframes:[String!]!):Market!
    klines:[Kline]
}
`

module.exports={typeDefs}