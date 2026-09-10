import js from '@eslint/js'
import globals from 'globals'

export default [
    {
        ignores: [
            'dist/**',
            'examples/**',
            'dev/**',
            'tmp/**',
            // Third party / generated, kept as shipped upstream
            'js/vendor/**',
            'js/canvas2svg.js',
            'js/cram/cram-bundle.js'
        ]
    },
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.browser,
                Atomics: 'readonly',
                SharedArrayBuffer: 'readonly',
                gapi: 'readonly',
                Buffer: 'readonly',
                QUnit: 'readonly',
                global: 'readonly',
                require: 'readonly'
            }
        },
        rules: {
            'no-unused-vars': 'off',
            'no-prototype-builtins': 'off',
            'no-empty': 'off',
            'no-useless-escape': 'off',
            'no-cond-assign': 'off',
            'no-constant-condition': ['error', {checkLoops: false}],
            'no-control-regex': 'off',
            // Stylistic here: declarations in an unbraced `case` are used
            // throughout and are not a defect.
            'no-case-declarations': 'off',
            'require-atomic-updates': 'off',
            'no-inner-declarations': 'off'
        }
    },
    {
        // Ported from Python; reuses `var` names freely within a function.
        files: ['js/cnvpytor/**'],
        rules: {'no-redeclare': 'off'}
    }
]
