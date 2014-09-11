module.exports = function (grunt) {

    // 1. All configuration goes here
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        concat: {
            igv: {
                src: [
                    'js/*.js', // All JS in the libs folder
                    'js/gwas/*.js',
                    'js/bigwig/*.js',
                    'js/cursor/*.js',
                    'js/gtex/*.js',
                    'vendor/inflate.js',
                    'vendor/spin.js',
                    'vendor/inflate.js',
                    'vendor/zlib_and_gzip.min.js'
                ],
                dest: 'dist/igv-all.js'
            }
        },

        uglify: {
            options: {
                mangle: false
            },

            igv: {
                src: 'dist/igv-all.js',
                dest: 'dist/igv-all.min.js'
            }
        }

    });

    // 3. Where we tell Grunt we plan to use this plug-in.
    grunt.loadNpmTasks('grunt-contrib-concat');


    grunt.loadNpmTasks('grunt-contrib-uglify');

    // 4. Where we tell Grunt what to do when we type "grunt" into the terminal.
    //grunt.registerTask('default', ['concat:igvexp', 'uglify:igvexp']);
    grunt.registerTask('default', ['concat:igv', 'uglify:igv']);


};

