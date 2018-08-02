module.exports = function (grunt) {

    // 1. All configuration goes here
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        concat: {
            igv: {
                src: [
                    'wrapper/header.js',
                    'tmp/embedCss.js',
                    'vendor/jquery-1.12.4.js',
                    'vendor/jquery-ui.js',
                    'vendor/underscore.js',
                    'vendor/zlib_and_gzip.js',
                    'vendor/inflate.js',
                    'vendor/jquery.mousewheel.js',
                    'vendor/rbtree.js',
                    'vendor/tdigest.js',
                    'js/**/*.js',
                    'wrapper/footer.js'
                ],
                dest: 'dist/igv.js'
            },
            igv_es6: {
                src: [
                    'wrapper/header-es6.js',
                    'tmp/embedCss.js',
                    'vendor/jquery-1.12.4.js',
                    'vendor/jquery-ui.js',
                    'vendor/underscore.js',
                    'vendor/zlib_and_gzip.js',
                    'vendor/inflate.js',
                    'vendor/jquery.mousewheel.js',
                    'vendor/rbtree.js',
                    'vendor/tdigest.js',
                    'js/**/*.js',
                    'wrapper/footer-es6.js'
                ],
                dest: 'dist/igv.es6.js'
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
            igv_es6: {
                src: 'dist/igv.es6.js',
                dest: 'dist/igv.es6.min.js'
            }
        },

    });

    // 3. Where we tell Grunt we plan to use this plug-in.
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify-es');

    // 4. Where we tell Grunt what to do when we type "grunt" into the terminal.
    grunt.registerTask('default', [ 'concat:css', 'embed-css', 'concat:igv', 'concat:igv_es6', 'uglify:igv', 'uglify:igv_es6']);

    grunt.registerTask('doc', ['md2html']);

    grunt.task.registerTask('embed-css', 'One line-ify igv.css.', function () {

        var ping,
            pong,
            foo;

        ping = grunt.file.read('tmp/igv-all.css');
        pong = ping.replace(/\n/g, '\\n');
        ping = pong.replace(/"/g, '\\"');

        foo = grunt.file.read('wrapper/embedCss.js');
        foo = foo.replace('_CSS_', ping)

        grunt.file.write('tmp/embedCss.js', foo);
    });

};

