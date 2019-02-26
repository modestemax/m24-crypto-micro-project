let { priceChanged: priceChangedA } = require('./a_first_a')
let { priceChanged: priceChangedC } = require('./a_first_c')
let { priceChanged: priceChangedD } = require('./a_first_d')
let { priceChanged: priceChangedE } = require('./a_first_e')

module.exports = {
    priceChanged() {
        [
            // priceChangedA,
            // priceChangedC,
            // priceChangedD,
            priceChangedE,
        ]
            .forEach(priceChanged =>
                priceChanged.apply(null, arguments))
    }
}