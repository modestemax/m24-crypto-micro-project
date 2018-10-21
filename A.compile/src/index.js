const { wait } = require('common')

wait('B', 'A', () => {
    require('./get-signals')
    require('./backup-signal');
    require('./publish-signal');
}, { immediate: true, loadMarkets: false })

