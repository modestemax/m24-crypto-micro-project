let { priceChanged: priceChangedA } = require('./a_first_a')
let { priceChanged: priceChangedC } = require('./a_first_c')
let { priceChanged: priceChangedD } = require('./a_first_d')
let { priceChanged: priceChangedE } = require('./a_first_e')
let { priceChanged: priceChangedEBIS } = require('./a_first_e_bis')

module.exports = {
    priceChanged() {
        [
            // priceChangedA,
            // priceChangedC,
            // priceChangedD,
            // priceChangedE,
            priceChangedEBIS,
        ]
            .forEach(priceChanged =>
                priceChanged.apply(null, arguments))
    }
}