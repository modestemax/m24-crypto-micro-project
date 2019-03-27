require('./binance')
const { ApolloServer, gql } = require('apollo-server');


const { typeDefs } = require('./schemas/symbol/symbol.schema')
const { resolvers } = require('./schemas/symbol/symbol.resolver')
const server = new ApolloServer({ typeDefs, resolvers });

require('./simulator')

server.listen().then(({ url }) => {
    console.log(`🚀  Server ready at ${url}`);
});