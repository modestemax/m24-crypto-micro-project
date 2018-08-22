const debug = require('debug')('F:index');

require('./command')

const { subscribe: redisSubscribe } = require('common/redis');


redisSubscribe('m24:*', require('./m24-events'));

redisSubscribe('asset:*', require('./assets-events'));

console.log(process.env.APP_NAME+ ' Running '+ new Date());