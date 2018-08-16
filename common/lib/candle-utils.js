const { redisKeysExists } = require('./utils');

const $this = module.exports = {
    timeframeDuration: (timeframe) => timeframe * 60e3,

    getNewCandleId({ timeframe }) {
        return $this.getCandleId({ timeframe })
    },
    getCandleTime({ id, timeframe }) {
        return new Date(id * timeframeDuration(timeframe))
    },
    getCandleId({ time = Date.now(), timeframe }) {
        return Math.trunc(time / $this.timeframeDuration(timeframe));
    },
    getKeyById({ exchange, symbolId, timeframe, id }) {
        const date = $this.getCandleTime({ id, timeframe });
        const timeKey = `${date.getDate()}/${date.getMonth() + 1}:${date.getHours()}h${date.getMinutes()}`;
        return `${exchange}:${symbolId}:${timeKey}:m${timeframe}`;
    },

    getKeyAtTime({ exchange, symbolId, timeframe, time = Date.now() }) {
        const id = (Math.trunc(time / $this.timeframeDuration(timeframe)) * $this.timeframeDuration(timeframe));
        return $this.getKeyById({ exchange, symbolId, timeframe, id });
    },

    async   keyExistsAtPosition({ exchange, symbolId, timeframe, position = 0 }) {

        const time = new Date((Math.trunc((Date.now()) / $this.timeframeDuration(timeframe)) - position) * $this.timeframeDuration(timeframe))
        return $this.getKeyAtTime({ exchange, symbolId, timeframe, time })
    },

    async keyExistsAtPosition({ exchange, symbolId, timeframe, position = 0 }) {
        const key = $this.keyExistsAtPosition({ exchange, symbolId, timeframe, position });
        if (await redisKeysExists(key)) {
            return key
        }

    },

    async   getLastKey({ exchange, symbolId, timeframe, position = 0 }) {
        let key = await $this.keyExistsAtPosition.apply(null, arguments);
        if (key) {
            return key
        } else {
            return $this.getLastKey({ exchange, symbolId, timeframe, position: position + 1 })
        }
    },
}