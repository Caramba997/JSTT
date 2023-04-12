const escomplex = require('typhonjs-escomplex');
const fs = require('fs');
const path = require('path');

class Metrics {

  complexity(filePath) {
    const code = fs.readFileSync(filePath, { encoding: 'utf8', flag: 'r' });
    const result = escomplex.analyzeModule(code);
    console.log(result);
  }

}

module.exports = { Metrics };