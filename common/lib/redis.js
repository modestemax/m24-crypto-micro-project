const Promise = require("bluebird");
const _ = require("lodash");
// const ccxt = require("ccxt");
const redisLib = require("redis");
// const redisClient = redisLib.createClient({ host: process.env.REDIS_HOST });
const redis = Promise.promisifyAll(redisLib.createClient({ host: process.env.REDIS_HOST }));
const redisSub = Promise.promisifyAll(redisLib.createClient({ host: process.env.REDIS_HOST }));
const redisPub = Promise.promisifyAll(redisLib.createClient({ host: process.env.REDIS_HOST }));

redisSub.setMaxListeners(0);

module.exports = {
  redisKeysExists, redisGet, redisSet, subscribe, publish, getRedis,
};

function redisKeysExists(key) {
  return redis.existsAsync(key)
}

async function redisGet(key) {
  const data = await redis.getAsync(key)
  try {
    return JSON.parse(data)
  } catch (e) {
    return data
  }
}
async function redisSet({ key, data, expire }) {
  const strData = JSON.stringify(data);
  let res = await redis.setAsync(key, strData);
  expire && await redis.expireAsync(key, expire);
  return res;
}

//------------------------PUB/SUB---------------------
function getRedis() {
  return redis;
}

function publish(event, data, { rateLimit } = {}) {
  // console.log('redis publish',event,data)
  let redis = redisPub// getRedis();
  data = data === void 0 ? {} : data;
  let json = JSON.stringify(data);
  redis.publish(event, json);
}

function subscribe(event, handlers) {
  let redis = redisSub //getRedis();
  handlers = typeof handlers == 'function' ? { [event]: handlers } : handlers;
  redis.on('pmessage', async (pattern, channel, data) => {
    // console.log('redis event data received');
    let json;
    try { json = JSON.parse(data); } catch (e) { json = data }

    for (let regex in handlers) {
      if (new RegExp(regex).test(channel)) {
        handlers[regex](json, channel);
      }
    }
  });

  redis.psubscribe(event);
  return () => redis.punsubscribe(event);
}

