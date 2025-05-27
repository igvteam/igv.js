import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
    server: {
        port: 3000,
        open: true
    },
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        sourcemap: true,
        commonjsOptions: {
            include: [/node_modules/]
        }
    },
    resolve: {
        alias: {
            'igv-utils': path.resolve(__dirname, 'node_modules/igv-utils/src/index.js'),
            'dompurify': path.resolve(__dirname, 'node_modules/dompurify/dist/purify.es.mjs'),
            'vanilla-picker': path.resolve(__dirname, 'node_modules/vanilla-picker/dist/vanilla-picker.csp.mjs'),
            'circular-view': path.resolve(__dirname, 'node_modules/circular-view/dist/circular-view.js'),
            'hdf5-indexed-reader': path.resolve(__dirname, 'node_modules/hdf5-indexed-reader/dist/hdf5-indexed-reader.esm.js'),
            'igv-ui': path.resolve(__dirname, 'node_modules/igv-ui/dist/igv-ui.js')
        }
    },
    optimizeDeps: {
        include: [
            'igv-utils',
            'dompurify',
            'vanilla-picker',
            'circular-view',
            'hdf5-indexed-reader',
            'igv-ui'
        ],
        esbuildOptions: {
            target: 'es2020'
        }
    }
}); 