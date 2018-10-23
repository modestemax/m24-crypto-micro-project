const { PubSub } = require('apollo-server');

const pubsub = new PubSub();
const SIGNAL_LOADED = 'SIGNAL_LOADED';

module.exports = { pubsub, SIGNAL_LOADED }