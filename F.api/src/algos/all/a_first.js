let { priceChanged: priceChangedA } = require('./a_first_a')
let { priceChanged: priceChangedC } = require('./a_first_c')

module.exports = {
    priceChanged() {
        [priceChangedA, /*priceChangedC*/]
            .forEach(priceChanged =>
                priceChanged.apply(null, arguments))
    }
}