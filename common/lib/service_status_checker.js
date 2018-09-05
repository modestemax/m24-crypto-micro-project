const _ = require('lodash');
var schedule = require('node-schedule');
const { subscribe, publish } = require('./redis');

const { exchange } = require("./exchange");

const [publishThrottled, subscribeThrottled] = [_.throttle(publish, 30e3), _.throttle(subscribe, 30e3)]
module.exports = {
  wait, start
};


function wait(APPA, APPB, callback, { immediate = false, loadMarkets = true } = {}) {
  if (immediate) {
    start(APPB, callback, { loadMarkets })
  } else {
    console.log('Waiting', APPA)
    let unsubscribe = subscribe('m24sync:' + APPA, async () => (start(APPB, callback, { loadMarkets }), unsubscribe()));
    publish('m24sync:waiting:' + APPA, APPB + ' is Waiting for ' + APPA + ' to start ');
  }
}

async function start(APP, callback, { loadMarkets } = {}) {
  process.env.APP_NAME = process.env.APP_NAME || APP;
  console.log('\n\nStarting ' + (process.env.APP_NAME) + ' at ' + new Date() + '\n\n');
  try {
    loadMarkets && await exchange.loadMarkets()
    await callback();
    autoRestart(APP);
    console.log('\n\nStarted ' + (process.env.APP_NAME) + ' at ' + new Date() + '\n\n');
  } catch (ex) {
    console.error(ex,ex.stack);
    publish('m24:error', { message: process.env.APP_NAME + ' fail to start\n' + ex.message, stack: ex.stack });
    process.exit(1);
  }
  publish('m24sync:' + APP, 'Starting ' + APP);
  subscribe('m24sync:waiting:' + APP, () => publish('m24sync:' + APP))
}


subscribe('m24:service_status_check', async (data) => {
  publish('m24:service_status', Object.assign((data), { text: process.env.APP_NAME + ' OK' }))
});

process.on('unhandledRejection', (reason, p) => {
  if (!/\[object Object\]/.test(reason.message)) {
    console.error('Unhandled Rejection at: Promise', p, 'reason:', reason);
    let { message, stack } = reason;
    publishThrottled('m24:error', { message: process.env.APP_NAME + ` Unhandled Rejection ${message}`, stack })
  }
});

process.on('uncaughtException', (err) => {
  if (!/\[object Object\]/.test(err.message)) {
    console.error(err);
    publishThrottled('m24:error', { message: process.env.APP_NAME + ' uncaughtException ' + err.toString(), stack: err.stack })
  }
});

function autoRestart(APP) {
  schedule.scheduleJob('* 8 * * * *', process.exit(1));
}
