const root = require('app-root-path');
const fs = require('fs');
const jsonFormat = require('json-format');

class Files {
  constructor() {
    this.absPath = root;
    this.basePath = './';
    this.types = {
      css: 'ui/css/',
      html: 'ui/html/',
      js: 'ui/js/',
      map: 'ui/map/',
      webfonts: 'ui/webfonts',
      projects: 'projects',
      project: 'projects/{{id}}/'
    }
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
    const placeholders = path.match(/{{.*}}/g);
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
  raw(type, file, vars) {
    const path = this.path(type, file, vars);
    return fs.readFileSync(path, { encoding:'utf8', flag:'r' });
  }

  /**
   * Get an object of the json file content
   * @param {string} type One of the types from Files.types
   * @param {string|undefined} file Filename with ending
   * @param {string[]|undefined} vars Path variables if needed
   * @throws On error
   * @returns Object or undefined
   */
  json(type, file, vars) {
    const path = this.path(type, file, vars);
    if (!file.match(/\.json/)) {
      throw '[Files] json: File is not of type json';
    }
    return JSON.parse(fs.readFileSync(path, { encoding:'utf8', flag:'r' }));
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
  write(type, file, data, vars) {
    let strData = data;
    if (typeof data === 'object') {
      strData = jsonFormat(strData);
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

}

module.exports = { Files };