/*
 * js-data-redis
 * http://github.com/js-data/js-data-redis
 *
 * Copyright (c) 2014 Jason Dobry <http://www.js-data.io/js-data-redis>
 * Licensed under the MIT license. <https://github.com/js-data/js-data-redis/blob/master/LICENSE>
 */
module.exports = function (grunt) {
  'use strict';

  require('jit-grunt')(grunt, {
    coveralls: 'grunt-karma-coveralls'
  });
  require('time-grunt')(grunt);

  var pkg = grunt.file.readJSON('package.json');

  // Project configuration.
  grunt.initConfig({
    pkg: pkg,
    jshint: {
      all: ['Gruntfile.js', 'src/**/*.js', 'test/*.js'],
      jshintrc: '.jshintrc'
    },
    watch: {
      dist: {
        files: ['src/**/*.js'],
        tasks: ['build']
      }
    },
    coveralls: {
      options: {
        coverage_dir: 'coverage'
      }
    },
    mochaTest: {
      all: {
        options: {
          reporter: 'spec'
        },
        src: ['mocha.start.js', 'test/**/*.js']
      }
    }
  });

  grunt.registerTask('n', ['mochaTest']);

  grunt.registerTask('test', ['build', 'n']);
  grunt.registerTask('build', [
    'jshint'
  ]);
  grunt.registerTask('go', ['build', 'watch:dist']);
  grunt.registerTask('default', ['build']);
};
