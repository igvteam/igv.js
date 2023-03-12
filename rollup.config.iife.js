import strip from '@rollup/plugin-strip';
import terser from "@rollup/plugin-terser"

export default [

    {
        input: 'js/index.js',
        output: [
            {file: 'dist/igv.iife.js', format: 'iife', name: "igv", sourcemap: true, plugins: [terser()]},
        ],
        plugins: [
            strip({
                debugger: true,
                functions: [/*'console.log', */'assert.*', 'debug']
            }),
        ]
    }
];
