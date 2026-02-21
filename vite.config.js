import { defineConfig } from 'vite'
import { readFileSync, copyFileSync } from 'fs'
import { transform } from 'esbuild'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

const minify = {
    name: 'esbuild-minify',
    async renderChunk(code) {
        const result = await transform(code, { minify: true, sourcemap: 'external' })
        return { code: result.code, map: result.map }
    }
}

const copyDts = {
    name: 'copy-dts',
    apply: 'build',
    closeBundle() {
        copyFileSync('js/igv.d.ts', 'dist/igv.d.ts')
    }
}

export default defineConfig({
    server: {
        open: '/examples/'
    },
    define: {
        __APP_VERSION__: JSON.stringify(pkg.version)
    },
    plugins: [copyDts],
    build: {
        lib: {
            entry: 'js/index.js',
            name: 'igv',
        },
        minify: false,
        sourcemap: true,
        rollupOptions: {
            output: [
                {format: 'es',  entryFileNames: 'igv.esm.js',     dir: 'dist'},
                {format: 'es',  entryFileNames: 'igv.esm.min.js', dir: 'dist', plugins: [minify]},
                {format: 'umd', entryFileNames: 'igv.js',         dir: 'dist', name: 'igv'},
                {format: 'umd', entryFileNames: 'igv.min.js',     dir: 'dist', name: 'igv', plugins: [minify]},
            ]
        },
    },
    css: {
        preprocessorOptions: {
            scss: {}
        }
    }
})
