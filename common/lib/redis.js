const Promise = require("bluebird");
const _ = require("lodash");
const ccxt = require("ccxt");
const redisLib = require("redis");
const redisClient = redisLib.createClient({ host: process.env.REDIS_HOST });
const redisPub = redisClient.duplicate();
const redis = Promise.promisifyAll(redisClient);


module.exports = {
  redisKeysExists, redisGet, redisSet, subscribe, publish, getRedis
};



function redisKeysExists(key) {
  return redis.existsAsync(key)
}

function redisGet(key) {
  return redis.getAsync(key)
}
async function redisSet({ key, data, expire }) {
  const strData = typeof data === 'string' ? data : JSON.stringify(data);
  let res = await redis.setAsync(key, strData);
  expire && await redis.expireAsync(key, expire);
  return res;
}

//------------------------PUB/SUB---------------------
function getRedis() {
  return Promise.promisifyAll(redisClient.duplicate());
}

function publish(event, data, { rateLimit } = {}) {
  // if(rateLimit)

  let json = typeof data === "string" ? data : JSON.stringify(data);
  redisPub.publish(event, json);
}

function subscribe(event, handlers) {
  let redis = getRedis();
  redis.on('pmessage', async (pattern, channel, data) => {
    const json = JSON.parse(data);
    for (regex in handlers) {
      if (new RegExp(regex).test(channel)) {
        handlers[regex](json);
      }
    }
  });

  redis.psubscribe(event);
}

