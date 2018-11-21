const { gql } = require('apollo-server')

const typeDefs = gql`
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

type Market{
    timeframe:Int!
    position:Int
    markets:[Symbol]
}
#union Signal=Kline | Bonus

type Kline{
    symbol:String!
    open:Float!
    close:Float!
    low:Float!
    high:Float!
    change_from_open:Float!
    change_to_high:Float!
    interval:String!
    position:Int!
}
type Bonus{
    symbol:String! 
    total:Float
}
type Klines{
    m1:[Kline]
    m3:[Kline]
    m5:[Kline]
    m15:[Kline]
    m30:[Kline]
    h1:[Kline]
    h2:[Kline]
    h4:[Kline]
    h6:[Kline]
    h8:[Kline]
    h12:[Kline]
    h24:[Kline]
    d1:[Kline]
    d3:[Kline]
    bonus:[Bonus]
}

type Query {
    signals:[Symbol!]!
}

type Subscription{
    signalLoaded1(timeframe:Int,position_min:Int):Market!
    signalLoaded(timeframes:[String!]!):Market!
    klines:[Klines!]!
}
`

module.exports = { typeDefs }