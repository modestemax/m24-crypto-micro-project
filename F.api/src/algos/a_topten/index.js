let { priceChanged: a } = require('./a_topten_a')

module.exports = {
    interval: '12h', limit: 60,
    priceChanged() {
        [
            a
        ]
            .forEach(priceChanged =>
                priceChanged.apply(null, arguments))
    }
}