const { getRedis, publish } = require('./utils');
const redisSub = getRedis();
const APP_NAME= process.argv[1];

redisSub.on('pmessage', async (pattern, channel, data) => {

  if (channel === 'm24:service_status_check') {
    publish('m24:service_status', Object.assign(JSON.parse(data), { text: process.env.STATUS_OK_TEXT ||APP_NAME }))
  }
});
redisSub.psubscribe('m24:service_status_check');

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
  let { message, stack } = reason;
  publish('m24:error', { message: APP_NAME +` Unhandled Rejection ${message}`, stack })
});

process.on('uncaughtException', (err) => {
  console.log(err);
  publish('m24:error', { message: APP_NAME + ' uncaughtException ' + err.toString(), stack: err.stack })
});
