/** @type {import('snowpack').SnowpackUserConfig} */
module.exports = {
    "mount": {
        "public": {
            "url": "/",
            "static": true
        },
        "src": {
            "url": "/dist"
        }
    },
    "plugins": [
        "@snowpack/plugin-typescript"
    ],
    "routes": [],
    "optimize": {},
    "packageOptions": {
        "source": "remote"
    },
    "devOptions": {},
    "buildOptions": {},
    "exclude": [
        "node_modules"
    ]
}