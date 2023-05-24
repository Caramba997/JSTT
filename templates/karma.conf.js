module.exports = function(config) {
  config.set({

    reporters: ['coverage'],

    preprocessors: {
      'src/**/*.js': ['coverage']
    },

    plugins : [ 'karma-coverage' ],

    coverageReporter: {
      type : 'json-summary',
      dir : 'coverage/'
    },

    singleRun: true

})};
