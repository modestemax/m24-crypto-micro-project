const { wait } = require('common')

wait('B', 'A', () => {
    require('./signals')
    require('./builder');
    require('./saveIndicator');
},{immediate:true})

