const { subscribe } = require('common/redis');
const prices = module.exports = {};


subscribe('price', price => {
    prices[price.symbol] = +price.close
});
