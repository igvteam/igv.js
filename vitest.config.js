import { defineConfig } from 'vitest/config'
import { readFileSync } from 'fs'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

export default defineConfig({
    define: {
        __APP_VERSION__: JSON.stringify(pkg.version)
    },
    test: {
        environment: 'node',
        globals: true,
        setupFiles: ['./test/utils/mockObjects.js'],
        include: ['test/test*.js'],
        testTimeout: 30000
    }
})
