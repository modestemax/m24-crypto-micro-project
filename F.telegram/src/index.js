const debug = require('debug')('F:index');
const { subscribe: redisSubscribe } = require('common/redis');


const { start } = require('common')

start('F', () => {

    require('./command')
    redisSubscribe('m24:*', require('./m24-events'));
    redisSubscribe('asset:*', require('./assets-events'));

})
