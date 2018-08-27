const { wait } = require('common')

wait('C', 'B', () => {
    require('./init')
})

