var path = require('path');
var lrSnippet = require('grunt-contrib-livereload/lib/utils').livereloadSnippet;

var folderMount = function folderMount(connect, point) {
  return connect.static(path.resolve(point));
};

var proxySnippet = require('grunt-connect-proxy/lib/utils').proxyRequest;

module.exports = function(grunt) {
  grunt.initConfig({
    uglify: {
      'build/application.js': 'build/application.js'
    },

    /* Concat css */
    cssmin: {
      compress: {
        files: {
          'build/application.css': ['app/css/**/*.css']
        }
      }
    },

    /* Optimize images */
    imagemin: {
      dist: {
        files: [{
          expand: true,
          cwd: 'app/images',
          src: '*.{png,jpg,jpeg}',
          dest: 'build/images'
        }]
      }
    },

    /* remove image backups */
    clean: {
      build: ['build']
    },

    /* copy other files like icons */
    copy: {
      dist: {
        files: [{
          expand: true,
          dot: true,
          cwd: 'app',
          dest: 'build',
          src: [
            '*.{ico,txt}',
            '.htaccess',
            'index.html'
          ]
        }]
      }
      /*move files into app folders: phonegap: {

      }*/
    },

    /* resolve dependencies */
    neuter: {
      development: {
        options: {
          includeSourceURL: true
        },
        files: {
          'build/application.js': 'app/js/main.js'
        }
      },
      production: {
        options: {
          includeSourceURL: false,
          filepathTransform: function(filepath) {
            // use ember production build which does not include debug logs and assertions
            if (filepath === 'app/js/vendor/ember') {
              return 'app/js/vendor/ember.prod';
            }

            return filepath;
          }
        },
        files: {
          'build/application.js': 'app/js/main.js'
        }
      }
    },

    /* precompile ember templates */
    emberTemplates: {
      options: {
        templateName: function(sourceFile) {
          return sourceFile.replace(/app\/templates\//, '');
        },
        handlebarsPath: 'app/js/vendor/handlebars.js'
      },
      'tmp/templates.js': ["app/templates/**/*.hbs"]
    },

    /* watch files and run tasks on change */
    regarde: {
      application_code: {
        files: ['tmp/templates.js', 'app/js/**/*.js', 'test/**/*.js'],
        tasks: ['neuter:development', 'livereload']
      },
      handlebars_templates: {
        files: ['app/templates/**/*.hbs'],
        tasks: ['emberTemplates', 'neuter:development', 'livereload']
      },
      css: {
        files: ['app/css/**/*.css'],
        tasks: ['cssmin', 'livereload']
      },
      images: {
        files: ['app/images/**'],
        tasks: ['imagemin', 'livereload']
      }
    },

    /* start livereload server */
    connect: {
      options: {
        port: 8000,
        // change this to '0.0.0.0' to access the server from outside
        hostname: 'localhost'
      },
      livereload: {
        options: {
          middleware: function(connect, options) {
            return [proxySnippet, lrSnippet, folderMount(connect, '.')];
          }
        }
      },
      // proxy every request starting with /api to localhost:3000
      proxies: [
        {
          context: '/api',
          host: 'localhost',
          port: 3000,
          https: false,
          changeOrigin: false
        }
      ]
    },

    /* build test runner so that we do not have to include each test script manually */
    build_test_runner_file: {
      all: ['test/**/*.test.js']
    },

    /* run mocha tests using phantomjs */
    mocha: {
      all: {
        src: ['test/testrunner.html'],
        options: {
          run: true
        }
      }
    }
  });


  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-neuter');
  grunt.loadNpmTasks('grunt-ember-templates');
  grunt.loadNpmTasks('grunt-regarde');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-connect-proxy');
  grunt.loadNpmTasks('grunt-contrib-livereload');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-mocha');
  grunt.loadNpmTasks('grunt-contrib-imagemin');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-clean');

  grunt.registerMultiTask('build_test_runner_file', 'Creates a test runner file.', function(){
    var tmpl = grunt.file.read('test/testrunner.html.template');
    var renderingContext = {
      data: {
        files: this.filesSrc.map(function(fileSrc){
          return fileSrc.replace('test/', '');
        })
      }
    };
    grunt.file.write('test/testrunner.html', grunt.template.process(tmpl, renderingContext));
  });

  grunt.registerTask('build', ['clean:build', 'emberTemplates', 'neuter:production', 'uglify', 'cssmin', 'imagemin', 'copy']);

  grunt.registerTask('test', ['emberTemplates', 'neuter:development', 'build_test_runner_file', 'mocha']);

  grunt.registerTask('default', ['configureProxies', 'livereload-start', 'connect:livereload', 'emberTemplates', 'neuter:development', 'cssmin', 'imagemin', 'copy', 'regarde']);
};
