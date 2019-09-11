const path = require('path')

function configFor(target) {

    let filenameQualifier = 'umd' === target ? '' : '.' + target;
    let libraryTarget = 'esm' === target ? 'var' : target

    return {
        mode: 'development',
        entry: ['regenerator-runtime/runtime', './js/api.js'],
        target: 'web',
        output: {
            path: path.resolve(__dirname, 'dist'),
            filename: `igv${filenameQualifier}.min.js`,
            library: 'igv',
            libraryTarget: libraryTarget
        },
        module: {
            rules: [
                {
                    exclude: /node_modules/,
                    use: {
                        loader: 'babel-loader',
                        options: {
                            presets: [
                                '@babel/preset-env',

                            ],
                            plugins: [
                                "@babel/plugin-transform-regenerator",
                                ["transform-remove-console", {"exclude": ["error", "warn"]}]]
                        },

                    },
                },
            ],
        },
        devtool: "source-map"
    }
}

module.exports = configFor;