const configFor = require('./webpack.config.generator.js');
const webpackEsmConfig = configFor('esm');
const webpackUmdConfig = configFor('umd');

module.exports = function (grunt) {

    // 1. All configuration goes here
    grunt.initConfig({

        pkg: grunt.file.readJSON('package.json'),

        qunit_puppeteer: {
            test: {
                options: {
                    headless: true,
                    traceSettings: {
                        outputConsole: false,
                        outputAllAssertions: false
                    },
                    qunitPage: 'http://0.0.0.0:8000/test/runTestBundle.html'
                }
            }
        },

        connect: {
            server: {
                options: {
                    port: 8000,
                    base: '.'
                }
            }
        },

        webpack: {
            options: {
                stats: !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
            },
            esm: webpackEsmConfig,
            umd: webpackUmdConfig
        },

        concat: {
            igv_esm: {
                src: [
                    'dist/igv.esm.min.js',
                    'wrapper/footer-esm.js'
                ],
                dest: 'dist/igv.esm.min.js'
            },
        },

        clean: {
            dist: ['dist'],
            tmp: ['tmp']
        }

    });

    // 3. Where we tell Grunt we plan to use this plug-in.
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-qunit-puppeteer');
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-webpack');

    // 4. Where we tell Grunt what to do when we type "grunt" into the terminal.
    grunt.registerTask('default', [
        'clean:dist',
        'webpack:umd',
        'webpack:esm',
        'concat:igv_esm',
        'clean:tmp'
    ]);

    grunt.registerTask('test', ['connect', 'qunit_puppeteer:test']);

};

