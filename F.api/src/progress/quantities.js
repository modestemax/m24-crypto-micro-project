const quantities = module.exports = {};
const binance = require('../init-binance');
let timeout;

balance();

quantities.check = function () {
    balance()
}

function balance() {
    clearTimeout(timeout)
    binance.useServerTime(function () {
        binance.balance((error, balances) => {
            // if (error) console.error(error);
            if (!error) {
                console.log("balances() loaded");
                Object.assign(quantities, balances)
            }
            timeout = setTimeout(balance, 1e3 * 60)
        });
    });
}

