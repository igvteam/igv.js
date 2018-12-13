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
                    qunitPage: 'http://0.0.0.0:8000/test/runTests.html'
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
        babel: {
            options: {
                sourceMap: true,
                presets: ['@babel/preset-env'],
                plugins: [["transform-remove-console", {"exclude": ["error", "warn"]}]]

            },
            dist: {
                files: [
                    {
                        expand: true,
                        cwd: 'js/',
                        src: ['**/*.js'],
                        dest: 'es5/'
                    }
                ]
            }
        },

        concat: {
            igv: {
                src: [
                    'wrapper/header.js',
                    'tmp/embedCss.js',
                    'vendor/jquery-3.3.1.slim.js',
                    'vendor/underscore.js',
                    'vendor/zlib_and_gzip.js',
                    'vendor/inflate.js',
                    'vendor/jquery.mousewheel.js',
                    'vendor/rbtree.js',
                    'vendor/tdigest.js',
                    'vendor/cram-bundle.js',
                    'es5/**/*.js',
                    'wrapper/footer.js'
                ],
                dest: 'dist/igv.js'
            },
            igv_esm: {
                src: [
                    'wrapper/header-esm.js',
                    'tmp/embedCss.js',
                    'vendor/jquery-3.3.1.slim.js',
                    'vendor/underscore.js',
                    'vendor/zlib_and_gzip.js',
                    'vendor/inflate.js',
                    'vendor/jquery.mousewheel.js',
                    'vendor/rbtree.js',
                    'vendor/tdigest.js',
                    'vendor/cram-bundle.js',
                    'js/**/*.js',
                    'wrapper/footer-esm.js'
                ],
                dest: 'dist/igv.esm.js'
            },
            igv_quick: {
                src: [
                    'wrapper/header.js',
                    'tmp/embedCss.js',
                    'vendor/jquery-3.3.1.slim.js',
                    'vendor/underscore.js',
                    'vendor/zlib_and_gzip.js',
                    'vendor/inflate.js',
                    'vendor/jquery.mousewheel.js',
                    'vendor/rbtree.js',
                    'vendor/tdigest.js',
                    'vendor/cram-bundle.js',
                    'js/**/*.js',
                    'wrapper/footer.js'
                ],
                dest: 'dist/igv.js'
            },
            zlib: {
                src: [
                    'vendor/zlib/zlib.js',
                    'vendor/zlib/zip.js',
                    'vendor/zlib/huffman.js',
                    'vendor/zlib/rawinflate.js',
                    'vendor/zlib/rawinflate_stream.js',
                    'vendor/zlib/inflate.js',
                    'vendor/zlib/inflate_stream.js',
                    'vendor/zlib/gunzip.js',
                    'vendor/zlib/gunzip_member.js',
                    'vendor/zlib/gzip.js',
                    'vendor/zlib/heap.js',
                    'vendor/zlib/rawdeflate.js',
                    'vendor/zlib/unzip.js',
                    'vendor/zlib/util.js',
                    'vendor/zlib/adler32.js',
                    'vendor/zlib/bitstream.js',
                    'vendor/zlib/crc32.js',
                    'vendor/zlib/deflate.js'
                ],
                dest: 'vendor/zlib_and_gzip.js'
            },
            css: {
                src: [
                    'css/igv.css',
                    'vendor/fa-svg-with-js.css'
                ],
                dest: 'tmp/igv-all.css'
            }
        },

        uglify: {
            options: {
                mangle: false,
                sourceMap: true
            },
            igv: {
                src: 'dist/igv.js',
                dest: 'dist/igv.min.js'
            },
            igv_esm: {
                src: 'dist/igv.esm.js',
                dest: 'dist/igv.esm.min.js'
            }
        },

        clean: ['es5', 'tmp']

    });

    // 3. Where we tell Grunt we plan to use this plug-in.
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify-es');
    grunt.loadNpmTasks('grunt-qunit-puppeteer');
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('babel-core');
    grunt.loadNpmTasks('grunt-babel');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-copy');

    // 4. Where we tell Grunt what to do when we type "grunt" into the terminal.
    grunt.registerTask('default', ['babel', 'concat:css', 'embed-css', 'concat:igv', 'uglify:igv', 'concat:igv_esm', 'uglify:igv_esm', 'clean']);

    grunt.registerTask('quick-build', ['concat:css', 'embed-css', 'concat:igv_quick', 'clean']);

    grunt.registerTask('doc', ['md2html']);

    grunt.registerTask('test', ['connect', 'qunit_puppeteer:test']);

    grunt.task.registerTask('embed-css', 'One line-ify igv.css.', function () {

        var ping,
            pong,
            foo;

        ping = grunt.file.read('tmp/igv-all.css');
        ping = ping.replace(/\r\n/g, '\\n');
        pong = ping.replace(/\n/g, '\\n');
        ping = pong.replace(/"/g, '\\"');

        foo = grunt.file.read('wrapper/embedCss.js');
        foo = foo.replace('_CSS_', ping);

        grunt.file.write('tmp/embedCss.js', foo);
    });

};

