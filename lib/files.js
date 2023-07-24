const root = require('app-root-path');
const fs = require('fs');
const fsP = require('fs').promises;
const path = require('path');
const jsonFormat = require('json-format');
const { FileTypes } = require('./format.js');
const { AWSClient } = require('../lib/aws.js');

class Files {
  constructor() {
    this.aws = new AWSClient();
    this.absPath = root;
    this.basePath = './';
    this.types = {
      css: 'ui/css/',
      html: 'ui/html/',
      js: 'ui/js/',
      map: 'ui/map/',
      webfonts: 'ui/webfonts',
      projects: 'projects',
      project: 'projects/{{id}}/',
      files: 'projects/{{id}}/files/{{repo}}/',
      knowledge: 'knowledge/'
    };
    this.testKeywords = [
      '(?<!crea|execu)test',
      'spec',
      'cypress'
    ];
    this.perfTestKeywords = [
      'bench',
      'perf'
    ]
    this.testRegex = new RegExp(this.testKeywords.join('|'));
    this.perfTestRegex = new RegExp(this.perfTestKeywords.join('|'));
    this.skipFiles = [
      'babelrc',
      'eslintrc',
      'prettierrc',
      'commitlintrc',
      'Gruntfile',
      '\\.min',
      'fixture',
      '\\.conf'
    ];
    this.skipFilesRegex = new RegExp(this.skipFiles.join('|'));
  }

  /**
   * Create the path with given parameters
   * @param {string} type One of the types from Files.types
   * @param {string|undefined} file Filename with ending
   * @param {string[]|undefined} vars Path variables if needed
   * @throws On error
   * @returns Relative path
   */
  path(type, file, vars) {
    let path = this.types[type];
    if (path === undefined) {
      throw '[Files] path: Unknown type';
    }
    const placeholders = path.match(/{{[^{]*}}/g);
    if (placeholders) {
      if (!vars || !(vars instanceof Array) || vars.length < placeholders.length) {
        throw '[Files] path: Missing vars for given type';
      }
      for (let i = 0; i < placeholders.length; i++) {
        path = path.replace(placeholders[i], vars[i]);
      }
    }
    if (file) path += file;
    return this.basePath + path;
  }

  /**
   * Get the raw content of a file
   * @param {string} type One of the types from Files.types
   * @param {string|undefined} file Filename with ending
   * @param {string[]|undefined} vars Path variables if needed
   * @throws On error
   * @returns File content or undefined
   */
  async raw(type, file, vars) {
    const path = this.path(type, file, vars);
    return vars[0] === 'pavel' ? await this.aws.download(path) : await fsP.readFile(path, { encoding:'utf8', flag:'r' });
  }

  /**
   * Get an object of the json file content
   * @param {string} type One of the types from Files.types
   * @param {string|undefined} file Filename with ending
   * @param {string[]|undefined} vars Path variables if needed
   * @throws On error
   * @returns Object or undefined
   */
  async json(type, file, vars) {
    const path = this.path(type, file, vars);
    if (!file.match(/\.json/)) {
      throw '[Files] json: File is not of type json';
    }
    const data = vars[0] === 'pavel' ? await this.aws.download(path) : await fsP.readFile(path, { encoding:'utf8', flag:'r' });
    return JSON.parse(data);
  }

  /**
   * Write content to a file
   * @param {string} type One of the types from Files.types
   * @param {string} file Filename with ending
   * @param {string|Object} data Data to write to file, objects are formatted to readable strings
   * @param {string[]|undefined} vars Path variables if needed
   * @param {boolean} raw True, if objects should not be written in human readable way
   * @throws On error
   * @returns true or undefined
   */
  async write(type, file, data, vars, raw = false) {
    let strData = data;
    if (typeof data === 'object') {
      strData = raw ? JSON.stringify(strData) : jsonFormat(strData);
    }
    const path = this.path(type, file, vars);
    await this.aws.upload(path, strData);
    return true;
  }

  /**
   * Write content to a file
   * @param {string} type One of the types from Files.types
   * @param {string} file Filename with ending
   * @param {string|Object} data Data to write to file, objects are formatted to readable strings
   * @param {string[]|undefined} vars Path variables if needed
   * @throws On error
   * @returns true or undefined
   */
  writeMin(type, file, data, vars) {
    let strData = data;
    if (typeof data === 'object') {
      strData = JSON.stringify(strData);
    }
    const path = this.path(type, file, vars);
    fs.writeFileSync(path, strData);
    return true;
  }

  /**
   * Checks if a path exists
   * @param {string} type One of the types from Files.types
   * @param {string|undefined} file Filename with ending
   * @param {string[]|undefined} vars Path variables if needed
   * @throws On error
   * @returns True or false
   */
  exists(type, file, vars) {
    const path = this.path(type, file, vars);
    return (fs.existsSync(path));
  }

  /**
   * Format a given string to a safe string without special characters
   * @param {string} str String to be formatted
   * @returns Formatted string
   */
  safeFormat(str) {
    return str.replace(/[^\w]/g, '_');
  }

  /**
   * Checks if a project contains tests
   * @param {string} dirPath Path to project directory
   * @param {Object} results Only for recursion, leave undefined
   * @returns Object containing results or false if no tests were found
   */
  hasTests(dirPath, results = { dirs: [], files: [] }) {
    const dirs = fs.readdirSync(dirPath, {withFileTypes: true});
    for (let i = 0; i < dirs.length; i++) {
      if (dirs[i].isDirectory()) {
        if (dirs[i].name.includes('node_modules') || dirs[i].name.includes('instrumented') || dirs[i].name.includes('bower_components') || dirs[i].name.includes('fixture')) continue;
        if (this.testRegex.test(dirs[i].name.toLowerCase())) results.dirs.push(`${dirPath}${dirs[i].name}`);
        this.hasTests(`${dirPath}${dirs[i].name}/`, results);
      }
      else if (FileTypes.includes(path.extname(dirs[i].name).replace(/\./, '')) && this.testRegex.test(dirs[i].name.toLowerCase())) {
        if (dirs[i].name.match(this.skipFilesRegex) !== null) continue;
        results.files.push(`${dirPath}${dirs[i].name}`);
      }
    }
    return (results.dirs.length > 0 || results.files.length > 0) ? results : false;
  }

  /**
   * Checks if a project contains performance tests
   * @param {string} dirPath Path to project directory
   * @param {Object} results Only for recursion, leave undefined
   * @returns Object containing results or false if no tests were found
   */
  hasPerformanceTests(dirPath, results = { dirs: [], files: [] }) {
    const dirs = fs.readdirSync(dirPath, {withFileTypes: true});
    for (let i = 0; i < dirs.length; i++) {
      if (dirs[i].isDirectory()) {
        if (dirs[i].name.includes('node_modules') || dirs[i].name.includes('instrumented') || dirs[i].name.includes('bower_components') || dirs[i].name.includes('fixture')) continue;
        if (this.perfTestRegex.test(dirs[i].name.toLowerCase())) results.dirs.push(`${dirPath}${dirs[i].name}/`);
        this.hasPerformanceTests(`${dirPath}${dirs[i].name}/`, results);
      }
      else if (FileTypes.includes(path.extname(dirs[i].name).replace(/\./, '')) && this.perfTestRegex.test(dirs[i].name.toLowerCase())) {
        if (dirs[i].name.match(this.skipFilesRegex) !== null) continue;
        results.files.push(`${dirPath}${dirs[i].name}`);
      }
    }
    return (results.dirs.length > 0 || results.files.length > 0) ? results : false;
  }

  /**
   * Returns all paths to files with JS/TS extension, categorized into source and test files
   * @param {string} dirPath Path to project directory, needs to end with '/'
   * @param {boolean} testDir True, if test directory
   * @returns Object containing arrays for each file type
   */
  getFilePaths(dirPath, testDir = false) {
    const paths = { source: [], test: [] };
    const dirs = fs.readdirSync(dirPath, {withFileTypes: true});
    for (let i = 0; i < dirs.length; i++) {
      if (dirs[i].isDirectory()) {
        if (dirs[i].name.includes('node_modules') || dirs[i].name.includes('instrumented') || dirs[i].name.includes('bower_components') || dirs[i].name.includes('fixture')) continue;
        const { source, test } = this.getFilePaths(`${dirPath}${dirs[i].name}/`, testDir || this.testRegex.test(dirs[i].name.toLowerCase()));
        paths.source.push(...source);
        paths.test.push(...test);
      }
      else if (FileTypes.includes(path.extname(dirs[i].name).replace(/\./, ''))) {
        if (dirs[i].name.match(this.skipFilesRegex) !== null) continue;
        if (testDir || this.testRegex.test(dirs[i].name.toLowerCase())) {
          paths.test.push(`${dirPath}${dirs[i].name}`);
        }
        else {
          paths.source.push(`${dirPath}${dirs[i].name}`);
        }
      }
    }
    return paths;
  }

  /**
   * Returns all paths to files with JS/TS extensions
   * @param {string} dirPath Path to any directory, needs to end with '/'
   * @returns Array containing file paths
   */
  getAllFilePaths(dirPath) {
    const paths = [];
    const dirs = fs.readdirSync(dirPath, {withFileTypes: true});
    for (let i = 0; i < dirs.length; i++) {
      if (dirs[i].isDirectory()) {
        paths.push(...this.getAllFilePaths(`${dirPath}${dirs[i].name}/`));
      }
      else if (FileTypes.includes(path.extname(dirs[i].name).replace(/\./, ''))) {
        paths.push(`${dirPath}${dirs[i].name}`);
      }
    }
    return paths;
  }

  /**
   * Removes illegal lines from code in repository
   * @param {string} dirPath Path to directory
   */
  clean(dirPath) {
    const dirs = fs.readdirSync(dirPath, {withFileTypes: true});
    for (let i = 0; i < dirs.length; i++) {
      if (dirs[i].isDirectory()) {
        this.clean(`${dirPath}${dirs[i].name}/`);
      }
      else if (FileTypes.includes(path.extname(dirs[i].name).replace(/\./, ''))) {
        const content = fs.readFileSync(`${dirPath}${dirs[i].name}`).toString().replace(/^#.*$/gm, '');
        fs.writeFileSync(`${dirPath}${dirs[i].name}`, content);
      }
    }
  }

}

module.exports = { Files };