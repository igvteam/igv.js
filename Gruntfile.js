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
                    'vendor/inflate.js',
                    'vendor/zlib_and_gzip.min.js',
                    'vendor/jquery.mousewheel.js',
                    'js/shim.js'
                ],
                dest: 'dist/igv.js'
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

        md2html: {
            multiple_files: {
                options: {
                    layout: 'doc/layout.html'
                },
                    files: [{
                        expand: true,
                        src: ['doc/**/*.md'],
                        dest: 'dist',
                        ext: '.html'
                    }]

            }
        }
    });

    // 3. Where we tell Grunt we plan to use this plug-in.
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-md2html');
    grunt.loadNpmTasks('grunt-contrib-qunit');
    grunt.loadNpmTasks('grunt-contrib-connect');

    // 4. Where we tell Grunt what to do when we type "grunt" into the terminal.
    //grunt.registerTask('default', ['concat:igvexp', 'uglify:igvexp']);
    //grunt.registerTask('default', ['concat:igv', 'uglify:igv', 'md2html:igv']);
    grunt.registerTask('default', ['concat:igv', 'uglify:igv', "md2html"]);

    grunt.task.registerTask('unittest', 'Run one unit test.', function (testname) {

        if (!!testname)
            grunt.config('qunit.all', ['test/' + testname + '.html']);

        grunt.task.run('qunit:all');

    });

    grunt.registerTask('doc', ['md2html']);
};

