const { getRedis, subscribe, publish } = require('./redis');
const redisSub = getRedis();
const APP_NAME = process.env.APP_NAME || process.argv[1];

subscribe('m24:service_status_check', async (data) => {
  publish('m24:service_status', Object.assign(JSON.parse(data), { text: APP_NAME + ' OK' }))
});

process.on('unhandledRejection', (reason, p) => {
  if (!/\[object Object\]/.test(reason.message)) {
    console.error('Unhandled Rejection at: Promise', p, 'reason:', reason);
    let { message, stack } = reason;
    publish('m24:error', { message: APP_NAME + ` Unhandled Rejection ${message}`, stack })
  }
});

process.on('uncaughtException', (err) => {
  if (!/\[object Object\]/.test(err.message)) {
    console.error(err);
    publish('m24:error', { message: APP_NAME + ' uncaughtException ' + err.toString(), stack: err.stack })
  }
});
