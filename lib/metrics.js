const escomplex = require('typhonjs-escomplex');
const fs = require('fs');
const path = require('path');
const { Files } = require('./files.js');

class Metrics {

  constructor() {
    this.files = new Files();
  }

  total(arr) {
    if (arr.length === 0) return null;
    return arr.reduce((prev, curr) => prev + curr, 0);
  }

  average(arr) {
    if (arr.length === 0) return null;
    console.log(arr.reduce((prev, curr) => prev + curr, 0) / arr.length);
    return arr.reduce((prev, curr) => prev + curr, 0) / arr.length;
  }

  median(arr) {
    if (arr.length === 0) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    console.log(sorted, sorted.length % 2 === 1, sorted[Math.floor(sorted.length / 2)], (sorted[sorted.length / 2- 1] + sorted[sorted.length / 2]) / 2);
    return sorted.length % 2 === 1 ? sorted[Math.floor(sorted.length / 2)] : (sorted[sorted.length / 2- 1] + sorted[sorted.length / 2]) / 2;
  }

  max(arr) {
    if (arr.length === 0) return null;
    return Math.max(...arr);
  }

  min(arr) {
    if (arr.length === 0) return null;
    return Math.min(...arr);
  }

  complexity(filePath) {
    const code = fs.readFileSync(filePath, { encoding: 'utf8', flag: 'r' });
    const result = escomplex.analyzeModule(code);
    return result;
  }

  complexityPaths(paths) {
    const values = {
      locM: [],
      loclM: [],
      ccM: [],
      hbugsM: [],
      hdiffM: [],
      heffortM: [],
      hlengthM: [],
      htimeM: [],
      hvocabM: [],
      hvolM: [],
      paramM: [],
      maintainM: [],
      locF: [],
      loclF: [],
      ccF: [],
      hbugsF: [],
      hdiffF: [],
      heffortF: [],
      hlengthF: [],
      htimeF: [],
      hvocabF: [],
      hvolF: [],
      paramF: [],
    };
    for (let i = 0; i < paths.length; i++) {
      const complex = this.complexity(paths[i]);
      values.locM.push(complex.aggregate.sloc.physical);
      values.loclM.push(complex.aggregate.sloc.logical);
      values.ccM.push(complex.aggregate.cyclomatic);
      values.hbugsM.push(complex.aggregate.halstead.bugs);
      values.hdiffM.push(complex.aggregate.halstead.difficulty);
      values.heffortM.push(complex.aggregate.halstead.effort);
      values.hlengthM.push(complex.aggregate.halstead.length);
      values.htimeM.push(complex.aggregate.halstead.time);
      values.hvocabM.push(complex.aggregate.halstead.vocabulary);
      values.hvolM.push(complex.aggregate.halstead.volume);
      values.paramM.push(complex.aggregate.paramCount);
      values.maintainM.push(complex.maintainability);
      for (let k = 0; k < complex.methods.length; k++) {
        const method = complex.methods[k];
        values.locF.push(method.sloc.physical);
        values.loclF.push(method.sloc.logical);
        values.ccF.push(method.cyclomatic);
        values.hbugsF.push(method.halstead.bugs);
        values.hdiffF.push(method.halstead.difficulty);
        values.heffortF.push(method.halstead.effort);
        values.hlengthF.push(method.halstead.length);
        values.htimeF.push(method.halstead.time);
        values.hvocabF.push(method.halstead.vocabulary);
        values.hvolF.push(method.halstead.volume);
        values.paramF.push(method.paramCount);
      }
    }
    const results = {};
    Object.entries(values).forEach(([name, arr]) => {
      results[name] = {};
      results[name].total = this.total(arr);
      results[name].avg = this.average(arr);
      results[name].med = this.median(arr);
      results[name].max = this.max(arr);
      results[name].min = this.min(arr);
    });
    return results;
  }

  complexityRepo(repoPath) {
    const { source, test } = this.files.getFilePaths(repoPath);
    const sourceMetrics = this.complexityPaths(source);
    const testMetrics = this.complexityPaths(test);
    return {
      source: sourceMetrics,
      test: testMetrics
    }
  }

}

module.exports = { Metrics };