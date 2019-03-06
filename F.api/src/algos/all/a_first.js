// let { priceChanged: priceChangedA } = require('./a_first_a')
// let { priceChanged: priceChangedC } = require('./a_first_c')
// let { priceChanged: priceChangedD } = require('./a_first_d')
// let { priceChanged: priceChangedE } = require('./a_first_e')
let { priceChanged: priceChangedFBIS } = require('./a_first_f_bis')
// let { priceChanged: priceChangedF } = require('./a_first_f')

module.exports = {
    priceChanged() {
        [
            // priceChangedA,
            // priceChangedC,
            // priceChangedD,
            // priceChangedE,
            // priceChangedEBIS,
            // priceChangedETIS,
            priceChangedFBIS,
        ]
            .forEach(priceChanged =>
                priceChanged.apply(null, arguments))
    }
}