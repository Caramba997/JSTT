const fs = require('fs');
const path = require('path');
const beautify = require('js-beautify').js;
const FileTypes = ['js', 'ts', 'cjs', 'mjs', 'es6', 'jsx', 'tsx', 'es'];

class Format {
  constructor() {
    this.fs = fs;
    this.options = {
      indent_size: 2,
      space_in_empty_paren: true,
      preserve_newlines: false,
    };
  }

  file(filePath) {
    const code = fs.readFileSync(filePath, { encoding: 'utf8', flag: 'r' });
    const formatted = beautify(code, this.options);
    console.log(filePath, code == formatted);
    fs.writeFileSync(filePath, formatted);
  }

  dir(dirPath) {
    const dirs = fs.readdirSync(dirPath, {withFileTypes: true});
    for (let i = 0; i < dirs.length; i++) {
      if (dirs[i].isDirectory()) {
        this.dir(`${dirPath}/${dirs[i].name}`);
      }
      else if (FileTypes.includes(path.extname(dirs[i].name).replace(/\./, ''))) {
        this.file(`${dirPath}/${dirs[i].name}`);
      }
    }
  }

}

module.exports = { Format, FileTypes };