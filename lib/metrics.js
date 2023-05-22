const escomplex = require('typhonjs-escomplex');
const fs = require('fs');
const { Files } = require('./files.js');
const { TsTypes, JsxTypes } = require('./format.js');
const findImports = require('find-imports');
const SpearmanRHO = require('spearman-rho');
const Parser = require('@babel/parser');
const JsxPlugin = require('@babel/plugin-syntax-jsx');
const walk = require('estree-walker').walk;
const { distance, closest } = require('fastest-levenshtein');

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

  parse(code, path) {
    let pathArr = path.split('/');
    const filename = pathArr[pathArr.length - 1];
    pathArr = filename.split('.');
    const type = (TsTypes.includes(pathArr[pathArr.length - 1])) ? 'ts' : (JsxTypes.includes(pathArr[pathArr.length - 1])) ? 'jsx' : 'js';
    const options = {
      allowImportExportEverywhere: true,
      allowAwaitOutsideFunction: true,
      allowNewTargetOutsideFunction: true,
      allowReturnOutsideFunction: true,
      allowSuperOutsideMethod: true,
      allowUndeclaredExports: true,
      attachComment: true,
      errorRecovery: true,
      sourceFilename: filename,
      sourceType: 'unambiguous',
      plugins: [
        'estree',
        'decorators',
        'asyncDoExpressions',
        'decimal',
        'decoratorAutoAccessors',
        'destructuringPrivate',
        'doExpressions',
        'explicitResourceManagement',
        'exportDefaultFrom',
        'functionBind',
        'functionSent',
        'importAssertions',
        'importReflection',
        'moduleBlocks',
        'partialApplication',
        'recordAndTuple',
        'regexpUnicodeSets',
        'throwExpressions'
      ]
    }
    let isTs = false;
    if (type === 'ts') {
      options.plugins.push([
        'typescript',
        {
          'dts': true
        }
      ]);
      isTs = true;
    }
    else if (type === 'jsx') {
      options.plugins.push('jsx');
    }
    try {
      const parsed = Parser.parse(code, options);
      return parsed;
    }
    catch (e) {
      if (e.reasonCode && e.reasonCode === 'MissingOneOfPlugins') {
        console.log('Parsing failed with reason missing plugin, retrying with jsx plugin');
        options.plugins.push('jsx');
        const parsed = Parser.parse(code, options);
        return parsed;
      }
      else if  (e.reasonCode && e.reasonCode === 'UnexpectedToken') {
        if (isTs) {
          console.log('Parsing failed with reason unexpected token, retrying with jsx plugin because is typescript');
          options.plugins.push('jsx');
        }
        else {
          console.log('Parsing failed with reason unexpected token, retrying with flow plugin');
          options.plugins.push('flow');
        }
        const parsed = Parser.parse(code, options);
        return parsed;
      }
      throw e;
    }
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
   * @param {string} tree AST
   * @returns Depth as number
   */
  depth(tree) {
    const blockTypes = ['BlockStatement', 'ClassBody', 'FunctionBody'];
    let currentLevel = 0,
        maxLevel = 0;
    walk(tree, {
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
   * @param {string} tree AST
   * @returns Depth as number
   */
  calls(tree) {
    const callType = 'CallExpression';
    let calls = 0;
    walk(tree, {
      enter (node) {
        if (node.type === callType) calls++;
      }
    });
    return calls;
  }

  /**
   * Executes a given function for each occurence of a function in the AST
   * @param {string} code Code
   * @param {function} method Function to call for each found occurence
   * @returns Array of results
   */
  eachFunction(tree, method) {
    const functionTypes = ['FunctionExpression', 'ArrowFunctionExpression'];
    const result = [];
    walk(tree, {
      enter (node) {
        if (functionTypes.includes(node.type)) {
          result.push(method(node));
        }
      }
    });
    return result;
  }

  valuesFromArr(arr) {
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
   * @param {string} tree AST
   * @returns Complexity report
   */
  complexity(tree) {
    const result = escomplex.analyzeModuleAST(tree);
    return result;
  }

  /**
   * Calc complexity metrics for performance tests
   * @param {Object} paths Object containing two arrays for dirs and files
   * @returns Complexity metrics object
   */
  complexityRepoPerf(paths) {
    const filePaths = [...paths.files];
    paths.dirs.forEach((dirPath) => {
      filePaths.push(...this.files.getAllFilePaths(dirPath));
    });
    return this.complexityPaths(filePaths);
  }

  /**
   * Extract coverage metrics from NYC coverage report
   * @param {Object} summary Summary JSON
   * @returns Coverage metrics
   */
  coverageFromSummary(summary) {
    const result = {};
    Object.entries(summary).forEach(([key, data]) => {
      if (key === 'total') return;
      result[key] = data;
    });
    return result;
  }

  /**
   * Calc complexity metrics for the given repo path
   * @param {*} repoPath Repo path
   * @returns Complexity metrics
   */
  complexityRepoPerModule(repoPath) {
    const { source, test } = this.files.getFilePaths(repoPath);
    const sourceMetrics = this.complexityPathsPerModule(source);
    const testMetrics = this.complexityPathsPerModule(test);
    const connections = this.connections(source, test);
    return {
      source: sourceMetrics,
      test: testMetrics,
      testConnections: connections
    }
  }

  connections(sourcePaths, testPaths) {
    const result = {};
    testPaths.forEach((path) => {
      const fixedModuleName = path.split('/').at(-1).replace(/\.[tT]est|\.[sS]pec|[tT]est|[sS]pec/, '');
      console.log(path, fixedModuleName);
      const fileNameMatches = sourcePaths.reduce((prev, curr) => {
        if (curr.includes(fixedModuleName)) prev.push(curr);
        return prev;
      }, []);
      if (fileNameMatches.length === 1) {
        result[path] = fileNameMatches[0];
      }
      else if (fileNameMatches.length > 1) {
        result[path] = closest(path, fileNameMatches);
      }
      else {
        const code = fs.readFileSync(path, { encoding: 'utf8', flag: 'r' }).toString();
        try {
          const importMatches = [];
          const tree = this.parse(code, path);
          walk(tree, {
            enter(node) {
              let importPath = null;
              if (node.type === 'ImportDeclaration') {
                importPath = node.source.value;
              }
              else if (node.type === 'CallExpression' && (node.callee.name === 'require' || node.callee.name === 'import') && node.arguments[0]) {
                importPath = node.arguments[0].value;
              }
              if (importPath != null && importPath.includes(fixedModuleName)) importMatches.push(importPath);
            }
          });
          if (importMatches.length === 1) {
            result[path] = importMatches[0];
          }
          else if (importMatches.length > 1) {
            result[path] = closest(path, importMatches);
          }
          else {
            result[path] = null;
          }
        }
        catch (e) {
          result[path] = null;
          console.error(e);
          console.error('Error in checking for imports while finding connections in ' + path);
        }
      }
    });
    return result;
  }
  
  /**
   * Calc complexity metrics for the given file paths
   * @param {string[]} paths Array of file paths
   * @returns Complexity metrics
   */
  complexityPathsPerModule(paths) {
    const result = {};
    for (let i = 0; i < paths.length; i++) {
      const values = {
        noF: 0,
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
        ecM: 0,
        acM: 0
      };
      result[paths[i]] = values;
      const metrics = result[paths[i]];
      const code = fs.readFileSync(paths[i], { encoding: 'utf8', flag: 'r' }).toString();
      try{
        const tree = this.parse(code, paths[i]);
        const complex = this.complexity(tree);
        metrics.locM = complex.aggregate.sloc.physical;
        metrics.loccM = this.comments(code);
        metrics.loclM = complex.aggregate.sloc.logical;
        metrics.ccM = complex.aggregate.cyclomatic;
        metrics.hbugsM = complex.aggregate.halstead.bugs;
        metrics.hdiffM = complex.aggregate.halstead.difficulty;
        metrics.heffortM = complex.aggregate.halstead.effort;
        metrics.hlengthM = complex.aggregate.halstead.length;
        metrics.htimeM = complex.aggregate.halstead.time;
        metrics.hvocabM = complex.aggregate.halstead.vocabulary;
        metrics.hvolM = complex.aggregate.halstead.volume;
        metrics.paramM = complex.aggregate.paramCount;
        metrics.maintainM = complex.maintainability;
        for (let k = 0; k < complex.methods.length; k++) {
          const method = complex.methods[k];
          metrics.noF += 1;
          metrics.locF.push(method.sloc.physical);
          metrics.loclF.push(method.sloc.logical);
          metrics.ccF.push(method.cyclomatic);
          metrics.hbugsF.push(method.halstead.bugs);
          metrics.hdiffF.push(method.halstead.difficulty);
          metrics.heffortF.push(method.halstead.effort);
          metrics.hlengthF.push(method.halstead.length);
          metrics.htimeF.push(method.halstead.time);
          metrics.hvocabF.push(method.halstead.vocabulary);
          metrics.hvolF.push(method.halstead.volume);
          metrics.paramF.push(method.paramCount);
        }
        metrics.nofM = complex.methods.length;
        metrics.dpM = this.depth(tree);
        metrics.dpF = this.eachFunction(tree, this.depth);
        metrics.mcM = this.calls(tree);
        Object.entries(metrics).forEach(([key, value]) => {
          if (Array.isArray(value)) metrics[key] = this.valuesFromArr(value);
        });
      }
      catch(e) {
        console.error(e);
        console.error('Error in generating complexity report for file ' + paths[i]);
        continue;
      }
    }
    try {
      this.importsPerModule(paths, result);
    }
    catch(e) {
      console.error(e);
      console.error('Error in generating coupling metrics');
    }
    return result;
  }

  /**
   * Calc how many imports a file has and how often it is imported by other modules
   * @param {string[]} filePaths File paths
   * @returns Object containing arrays for import and export values
   */
  importsPerModule(filePaths, metrics) {
    filePaths.forEach((path) => {
      const code = fs.readFileSync(path, { encoding: 'utf8', flag: 'r' }).toString();
      try {
        const tree = this.parse(code, path);
        walk(tree, {
          enter(node) {
            let importPath = null;
            if (node.type === 'ImportDeclaration') {
              importPath = node.source.value;
            }
            else if (node.type === 'CallExpression' && (node.callee.name === 'require' || node.callee.name === 'import') && node.arguments[0]) {
              importPath = node.arguments[0].value;
            }
            if (importPath != null) {
              metrics[path].ecM++;
              const name = importPath.split('/').at(-1);
              Object.keys(metrics).forEach((tempPath) => {
                if (tempPath.split('/').at(-1).includes(name)) metrics[tempPath].acM++;
              });
            }
          }
        });
      }
      catch (e) {
        console.error(e);
        console.error('Error in generating coupling stats for file ' + path);
      }
    });
  }

}

module.exports = { Metrics };