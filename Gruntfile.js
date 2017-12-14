module.exports = function (grunt) {

    // 1. All configuration goes here
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        qunit: {
            hello: ['test/helloQUnit.html'],
            all: ['test/**/*.html']
        },

        connect: {
            uses_defaults: {}
        },

        concat: {
            igv: {
                src: [
                    'wrapper/header.js',
                    'vendor/jquery-1.12.4.js',
                    'vendor/jquery-ui.js',
                    'vendor/underscore.js',
                    'vendor/zlib_and_gzip.js',
                    'vendor/inflate.js',
                    'vendor/jquery.mousewheel.js',
                    'vendor/promise.js',
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
            }
        },

        copy: {
            // css: {
            //     expand: true,
            //     src: 'css/igv.css',
            //     dest: 'dist'
            // },
            // img: {
            //     expand: true,
            //     cwd: 'css/img',
            //     src: '**',
            //     dest: 'dist/img/'
            // },
            cssExample: {
                src: 'css/igv.css',
                dest: 'examples/'
            },
            imgExample: {
                expand: true,
                cwd: 'css/img',
                src:'**',
                dest:'examples/css/img/'
            },
            jsExample: {
                expand: true,
                cwd: 'dist',
                src: 'igv*',
                dest: 'examples/js/'
            }
            // jsExample: {
            //     cwd: 'dist',
            //     src: 'igv*',
            //     dest: 'examples/js/'
            // }
        }
    });

    // 3. Where we tell Grunt we plan to use this plug-in.
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-qunit');
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-contrib-copy');

    // 4. Where we tell Grunt what to do when we type "grunt" into the terminal.
    //grunt.registerTask('default', ['concat:igvexp', 'uglify:igvexp']);
    //grunt.registerTask('default', ['concat:igv', 'uglify:igv', 'md2html:igv']);
    grunt.registerTask('default', ['concat:igv', 'uglify:igv', 'copy']);

    grunt.task.registerTask('unittest', 'Run one unit test.', function (testname) {

        if (!!testname)
            grunt.config('qunit.all', ['test/' + testname + '.html']);

        grunt.task.run('qunit:all');

    });

    grunt.registerTask('doc', ['md2html']);
};

