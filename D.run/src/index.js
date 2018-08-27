
const { wait } = require('common')

wait('F','D', async() => {
    await require('./prices')();
    require('./init');
})
