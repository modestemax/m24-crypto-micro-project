// let { priceChanged: priceChangedA } = require('./a_first_a')
// let { priceChanged: priceChangedC } = require('./a_first_c')
// let { priceChanged: priceChangedD } = require('./a_first_d')
// let { priceChanged: priceChangedE } = require('./a_first_e')
let { priceChanged: h } = require('./a_first_h')
// let { priceChanged: priceChangedF } = require('./a_first_f')

module.exports = {
    interval: '1m', limit: undefined,
    priceChanged() {
        [
            h,
        ]
            .forEach(priceChanged =>
                priceChanged.apply(null, arguments))
    }
}