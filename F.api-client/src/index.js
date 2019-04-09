import React from 'react';
import ReactDOM from 'react-dom';
import registerServiceWorker from './registerServiceWorker';
import App from './App';

import './style.css';

import 'bootstrap/dist/css/bootstrap.min.css';

import {ApolloProvider} from 'react-apollo';

import {ApolloClient} from 'apollo-client';
import {HttpLink} from 'apollo-link-http';
import {InMemoryCache} from 'apollo-cache-inmemory';
import {onError} from 'apollo-link-error';
import {ApolloLink} from 'apollo-link';
import {WebSocketLink} from 'apollo-link-ws';
import {split} from 'apollo-link';
import {getMainDefinition} from 'apollo-utilities';


// const HOST_NAME='142.44.246.201';
const HOST_NAME = (/localhost|127./.test(window.location.host)) ? 'localhost' : 'screener.neema.co.za';

const wsLink = new WebSocketLink({
    uri: `ws://${HOST_NAME}:4000/graphql`,
    options: {
        reconnect: true
    }
});

const errorLink = onError(({ graphQLErrors, networkError }) => {
    if (graphQLErrors) {
        // do something with graphql error
    }

    if (networkError) {
        // do something with network error
    }
});
//const GITHUB_BASE_URL = 'https://api.github.com/graphql';

let httpLink = new HttpLink({
    // uri: GITHUB_BASE_URL,
    uri: `http://${HOST_NAME}:4000/`,
    // uri: 'http://142.44.246.201:4000/',
    headers: {
        authorization: `Bearer ${
            process.env.REACT_APP_GITHUB_PERSONAL_ACCESS_TOKEN
            }`,
    },
});
httpLink = ApolloLink.from([errorLink, httpLink]);

const link = split(
    // split based on operation type
    ({ query }) => {
        const { kind, operation } = getMainDefinition(query);
        return kind === 'OperationDefinition' && operation === 'subscription';
    },
    wsLink,
    httpLink,
);

const cache = new InMemoryCache();

const client = new ApolloClient({
    link,
    cache,
});


ReactDOM.render(
    <ApolloProvider client={client}>
        <App/>
    </ApolloProvider>,
    document.getElementById('root')
);

registerServiceWorker();
