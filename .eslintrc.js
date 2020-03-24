module.exports = {
    "env": {
        "commonjs": true,
        "es6": true,
        "node": true,
        "browser": true
    },
    "extends": [
        "standard"
    ],
    "globals": {
        "Atomics": "readonly",
        "SharedArrayBuffer": "readonly"
    },
    "parserOptions": {
        "ecmaVersion": 2018
    },
    "rules": {
        "skipTemplates": 0
    }
};