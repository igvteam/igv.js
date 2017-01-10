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
                    'js/**/*.js',
                    '!js/module.js',
                    'vendor/inflate.js',
                    'vendor/zlib_and_gzip.min.js',
                    'vendor/jquery.mousewheel.js',
                    'vendor/promise-7.0.4.js',
                    'js/module.js',
                    'vendor/jquery.kinetic.min.js',
                    'vendor/underscore-min.js'
                ],
                dest: 'dist/igv.js'
            },
            css: {
                src: 'css/*.css',
                dest: 'dist/igv.css'
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
            img: {
                expand: true,
                cwd: 'css/img',
                src: '**',
                dest: 'dist/img/'
            }
        },

        cssmin: {
            igv: {
                files: {
                    'dist/igv.min.css': [ 'css/igv.css', 'css/igv-gtex.css', 'css/opentip.css' ]
                }
            },

            'minify-separately': {
                files: [{
                    expand: true,
                    cwd: 'dist',
                    src: ['*.css', '!*.min.css'],
                    dest: 'dist',
                    ext: '.min.css'
                }]
            }
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
    //grunt.registerTask('default', ['concat:igv', 'uglify:igv']);
    grunt.registerTask('default', ['concat:igv', 'uglify:igv', 'concat:css', 'cssmin:igv', 'copy:img']);

    grunt.task.registerTask('unittest', 'Run one unit test.', function (testname) {

        if (!!testname)
            grunt.config('qunit.all', ['test/' + testname + '.html']);

        grunt.task.run('qunit:all');

    });

    grunt.registerTask('doc', ['md2html']);
};

