const fs = require('fs');
const { Files } = require('./files.js');
const SpearmanRHO = require('spearman-rho');

class Correlations {
  constructor() {
    this.files = new Files();
  }

  repo(metrics) {
    //TODO
  }

}

module.exports = { Correlations };