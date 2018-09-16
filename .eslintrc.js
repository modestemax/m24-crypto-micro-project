module.exports = {
    "env": {
        "es6": true,
        "node": true
    },
    "extends": "eslint:recommended",
    "parserOptions": {
        "ecmaVersion": 2018
    },
    "globals": {
        // "console": true,
        // "var2": false
    },
    "rules": {
        "no-console": "off",
        "no-unused-vars": "off",
        "no-inner-declarations":"off",
        "no-empty":"off",
        "indent": [
            "off",
            "tab"
        ],
        "quotes": [
            "off",
            "single"
        ],
        "semi": [
            "off",
            "never"
        ]
    }
};