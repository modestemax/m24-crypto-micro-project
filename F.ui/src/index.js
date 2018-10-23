const { ApolloServer, gql } = require('apollo-server');


const {typeDefs}=require('./schemas/symbol')
const {resolvers}=require('./resolvers/symbol')
const server = new ApolloServer({ typeDefs, resolvers });

server.listen().then(({ url }) => {
    console.log(`🚀  Server ready at ${url}`);
  });