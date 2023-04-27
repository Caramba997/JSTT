const escomplex = require('typhonjs-escomplex');
const ast = require('abstract-syntax-tree');
const fs = require('fs');
const path = require('path');
const { Files } = require('./files.js');
const findImports = require('find-imports');
const SpearmanRHO = require('spearman-rho');

class Metrics {

  constructor() {
    this.files = new Files();
    this.escomplex = escomplex;
  }

  /**
   * Calc the sum of the given numbers
   * @param {number[]} arr Array of numbers
   * @returns Sum
   */
  total(arr) {
    if (arr.length === 0) return null;
    return arr.reduce((prev, curr) => prev + curr, 0);
  }

  /**
   * Calc the average of the given numbers
   * @param {number[]} arr Array of numbers
   * @returns Average
   */
  average(arr) {
    if (arr.length === 0) return null;
    return arr.reduce((prev, curr) => prev + curr, 0) / arr.length;
  }

  /**
   * Calc the median of the given numbers
   * @param {number[]} arr Array of numbers
   * @returns Median
   */
  median(arr) {
    if (arr.length === 0) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    return sorted.length % 2 === 1 ? sorted[Math.floor(sorted.length / 2)] : (sorted[sorted.length / 2- 1] + sorted[sorted.length / 2]) / 2;
  }

  /**
   * Find the maximum of the given numbers
   * @param {number[]} arr Array of numbers
   * @returns Maximum
   */
  max(arr) {
    if (arr.length === 0) return null;
    return Math.max(...arr);
  }

  /**
   * Find the minimum of the given numbers
   * @param {number[]} arr Array of numbers
   * @returns Minimum
   */
  min(arr) {
    if (arr.length === 0) return null;
    return Math.min(...arr);
  }

  /**
   * Count the number of lines of comments in the given code
   * @param {string} code Code
   * @returns Number of comments
   */
  comments(code) {
    const regex = /\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm;
    const matches = code.match(regex);
    if (matches === null) return 0;
    let total = 0;
    matches.forEach((match) => {
      const lines = match.split(/\r?\n/).filter(line => line !== '');
      total += lines.length;
    });
    return total;
  }

  /**
   * Calc the nesting depth of a code snippet
   * @param {string} code Code
   * @returns Depth as number
   */
  depth(code) {
    const tree = typeof code === 'string' ? ast.parse(code.toString()) : code;
    const blockTypes = ['BlockStatement', 'ClassBody', 'FunctionBody'];
    let currentLevel = 0,
        maxLevel = 0;
    ast.traverse(tree, {
      enter (node) {
        if (blockTypes.includes(node.type)) currentLevel++;
        maxLevel = Math.max(currentLevel, maxLevel);
      },
      leave (node) {
        if (blockTypes.includes(node.type)) currentLevel--;
      }
    });
    return maxLevel;
  }

  /**
   * Count the number of method calls in a code snippet
   * @param {string} code Code
   * @returns Depth as number
   */
  calls(code) {
    const tree = ast.parse(code.toString());
    const callType = 'CallExpression';
    return ast.count(tree, callType);
  }

  /**
   * Calc how many imports a file has and how often it is imported by other modules
   * @param {string[]} filePaths File paths
   * @returns Object containing arrays for import and export values
   */
  imports(filePaths) {
    const imports = findImports(filePaths, {
      absoluteImports: true,
      relativeImports: true
    });
    const temp = {};
    filePaths.forEach((path) => {
      temp[path.replace('./', '')] = {
        imports: 0,
        exports: 0
      };
    });
    Object.entries(imports).forEach(([path, stats]) => {
      const pathFixed = path.replaceAll('\\', '/');
      temp[pathFixed].imports = stats.length;
      stats.forEach((imp) => {
        Object.keys(temp).forEach((tempPath) => {
          const regex = new RegExp(`.*/${imp.replace(/[./\\]/g, '')}.\\w+$`);
          if (regex.test(tempPath)) temp[tempPath].exports++;
        });
        if (temp[imp] !== undefined) {
          temp[imp].exports++;
        }
      });
    });
    const result = {
      imports: [],
      exports: []
    };
    Object.entries(temp).forEach(([filePath, stats]) => {
      result.imports.push(stats.imports);
      result.exports.push(stats.exports);
    });
    return result;
  }

  /**
   * Executes a given function for each occurence of a function in the AST
   * @param {string} code Code
   * @param {function} method Function to call for each found occurence
   * @returns Array of results
   */
  eachFunction(code, method) {
    const tree = ast.parse(code.toString());
    const functionTypes = ['FunctionExpression', 'ArrowFunctionExpression'];
    const result = [];
    functionTypes.forEach((type) => {
      ast.each(tree, type, (node) => {
        result.push(method(node));
      });
    });
    return result;
  }

  valuesFromArr(arr, name) {
    const result = {};
    result.total = this.total(arr);
    result.avg = this.average(arr);
    result.med = this.median(arr);
    result.min = this.min(arr);
    result.max = this.max(arr);
    result.values = arr;
    return result;
  }

  /**
   * Create a complexity report for the given code
   * @param {string} code Code
   * @returns Complexity report
   */
  complexity(code) {
    const result = escomplex.analyzeModule(code);
    return result;
  }

  /**
   * Calc complexity metrics for the given file paths
   * @param {string[]} paths Array of file paths
   * @returns Complexity metrics
   */
  complexityPaths(paths) {
    const values = {
      noM: [],
      locM: [],
      loccM: [],
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
      dpM: [],
      nofM: [],
      ecM: [],
      acM: [],
      mcM: [],
      noF: [],
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
      dpF: [],
    };
    for (let i = 0; i < paths.length; i++) {
      const code = fs.readFileSync(paths[i], { encoding: 'utf8', flag: 'r' });
      let complex;
      try{
        complex = this.complexity(code);
        values.noM.push(1);
        values.locM.push(complex.aggregate.sloc.physical);
        values.loccM.push(this.comments(code));
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
          values.noF.push(1);
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
        values.nofM.push(complex.methods.length);
        values.dpM.push(this.depth(code));
        values.dpF.push(...this.eachFunction(code, this.depth));
        values.mcM.push(this.calls(code));
      }
      catch(e) {
        console.error(e);
        console.error('Error in generating complexity report for file ' + paths[i]);
        continue;
      }
    }
    const coupling = this.imports(paths);
    values.ecM = coupling.imports;
    values.acM = coupling.exports;
    const results = {};
    Object.entries(values).forEach(([name, arr]) => {
      results[name] = this.valuesFromArr(arr, name);
    });
    return results;
  }

  /**
   * Calc complexity metrics for the given repo path
   * @param {*} repoPath Repo path
   * @returns Complexity metrics
   */
  complexityRepo(repoPath) {
    const { source, test } = this.files.getFilePaths(repoPath);
    const sourceMetrics = this.complexityPaths(source);
    const testMetrics = this.complexityPaths(test);
    // Test code to source code ratio
    if (sourceMetrics.locM.total !== null && testMetrics.locM.total !== null) {
      testMetrics.locrM = {
        total: testMetrics.locM.total / sourceMetrics.locM.total,
        avg: testMetrics.locM.avg / sourceMetrics.locM.avg,
        med: testMetrics.locM.med / sourceMetrics.locM.med
      }
    }
    return {
      source: sourceMetrics,
      test: testMetrics
    }
  }

  /**
   * Extract coverage metrics from NYC coverage report
   * @param {Object} summary Summary JSON
   * @returns Coverage metrics
   */
  coverageFromSummary(summary) {
    const values = {
      lcovM: [],
      scovM: [],
      fcovM: [],
      bcovM: [],
    };
    Object.entries(summary).forEach(([key, data]) => {
      if (key === 'total') return;
      values.lcovM.push(data.lines.pct);
      values.scovM.push(data.statements.pct);
      values.fcovM.push(data.functions.pct);
      values.bcovM.push(data.branches.pct);
    });
    const results = {};
    Object.entries(values).forEach(([name, arr]) => {
      results[name] = this.valuesFromArr(arr, name);
    });
    return results;
  }

}

module.exports = { Metrics };