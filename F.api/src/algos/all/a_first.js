let { priceChanged: priceChangedA } = require('./a_first_a')
let { priceChanged: priceChangedC } = require('./a_first_c')
let { priceChanged: priceChangedD } = require('./a_first_d')

module.exports = {
    priceChanged() {
        [
            // priceChangedA,
            // priceChangedC,
            priceChangedD,
        ]
            .forEach(priceChanged =>
                priceChanged.apply(null, arguments))
    }
}