const fs = require('fs');
const { Files } = require('../lib/files.js');
const files = new Files();

const settings = {
  path: 'D:/Projekte/Master/GitHub-Data-Collector/projects/version_1/files/AndresMorelos_Invoncify/'
};

const filePaths = files.getFilePaths(settings.path);
const counts = [];
filePaths.test.forEach((path) => {
  const raw = fs.readFileSync(path, { encoding:'utf8', flag:'r' });
  const matches = raw.match(/it\(['"]/gm);
  if (matches !== null) counts.push(matches.length);
});

console.log(counts.join(','));
console.log(counts.reduce((prev, curr) => prev + curr, 0));