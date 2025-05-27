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
        },
        rollupOptions: {
            external: [
                'igv-utils'
            ],
            output: {
                globals: {
                    'igv-utils': 'igvUtils'
                }
            }
        }
    },
    resolve: {
        alias: {
            'igv-utils': path.resolve(__dirname, 'node_modules/igv-utils/src/index.js')
        }
    },
    optimizeDeps: {
        include: [
            'igv-utils'
        ],
        esbuildOptions: {
            target: 'es2020'
        }
    }
}); 