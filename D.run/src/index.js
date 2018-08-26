console.log('\n\n' + process.env.APP_NAME + ' Running ' + new Date() + '\n\n');


const { exchange } = require("common");
exchange.loadMarkets().then(async () => {
    await require('./prices')();
    require('./init');

})