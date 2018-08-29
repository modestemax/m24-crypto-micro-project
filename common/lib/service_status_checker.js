const _ = require('lodash');
const { subscribe, publish } = require('./redis');
const APP_NAME = process.env.APP_NAME //|| process.argv[1];
const { exchange } = require("./exchange");

const [publishThrottled, subscribeThrottled] = [_.throttle(publish, 30e3), _.throttle(subscribe, 30e3)]
module.exports = {
  wait, start
};


function wait(APPA, APPB, callback) {
  console.log('Waiting', APPA)
  let unsubscribe = subscribe('m24sync:' + APPA, async () => (start(APPB, callback), unsubscribe()));
  publish('m24sync:waiting:' + APPA, APPB + ' is Waiting for ' + APPA + ' to start ');
}

async function start(APP, callback) {
  console.log('\n\nStarting ' + (APP_NAME || APP) + ' at ' + new Date() + '\n\n');
  await exchange.loadMarkets()
  await callback();
  publish('m24sync:' + APP, 'Starting ' + APP);
  subscribe('m24sync:waiting:' + APP, () => publish('m24sync:' + APP))
}


subscribe('m24:service_status_check', async (data) => {
  publish('m24:service_status', Object.assign((data), { text: APP_NAME + ' OK' }))
});

process.on('unhandledRejection', (reason, p) => {
  if (!/\[object Object\]/.test(reason.message)) {
    console.error('Unhandled Rejection at: Promise', p, 'reason:', reason);
    let { message, stack } = reason;
    publishThrottled('m24:error', { message: APP_NAME + ` Unhandled Rejection ${message}`, stack })
  }
});

process.on('uncaughtException', (err) => {
  if (!/\[object Object\]/.test(err.message)) {
    console.error(err);
    publishThrottled('m24:error', { message: APP_NAME + ' uncaughtException ' + err.toString(), stack: err.stack })
  }
});
