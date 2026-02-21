import { defineConfig } from 'vite'
import { readFileSync } from 'fs'
import { transform } from 'esbuild'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

const minify = {
    name: 'esbuild-minify',
    async renderChunk(code) {
        const result = await transform(code, { minify: true, sourcemap: 'external' })
        return { code: result.code, map: result.map }
    }
}

export default defineConfig({
    define: {
        __APP_VERSION__: JSON.stringify(pkg.version)
    },
    build: {
        lib: {
            entry: 'js/index.js',
            name: 'igv',
        },
        minify: false,
        sourcemap: true,
        rollupOptions: {
            output: [
                {format: 'iife', entryFileNames: 'igv.iife.js', dir: 'dist', name: 'igv', plugins: [minify]},
            ]
        },
    },
    css: {
        preprocessorOptions: {
            scss: {}
        }
    }
})
