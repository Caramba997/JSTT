const { LibrariesIO } = require('../lib/libraries-io.js');
const fs = require('fs');

const settings = {
  q: '',
  package: 'benchmark',
  languages: 'javascript,typescript',
  platforms: '',
  pages: 1
};

(async () => {
  console.log(`Retrieving total number of packages on Libraries.io for languages <${settings.languages}> and platforms <${settings.platforms !== '' ? settings.platforms : 'none'}>...`);
  const librariesIO = new LibrariesIO();
  const total = await librariesIO.getTotal(settings.languages, settings.platforms);
  console.log(`Found a total of ${total} packages`);
})();

// (async () => {
//   console.log(`Looking for the ${settings.pages * 30} most popular NPM packages${settings.q !== '' ? ' with query "' + settings.q + '"' : ''}...`);
//   const librariesIO = new LibrariesIO();
//   const modules = await librariesIO.searchPopular(settings.q, settings.pages);
//   const filename = `${process.cwd()}/results/npm/npm_${settings.q !== '' ? settings.q + '_' : ''}${Date.now()}.json`.replaceAll('\\', '/');
//   fs.writeFileSync(filename, JSON.stringify(modules));
//   console.log(`Successfully outputted package data to ${filename}`);
// })();

// (async () => {
//   console.log(`Looking for the dependent NPM packages of ${settings.package}...`);
//   const librariesIO = new LibrariesIO();
//   const modules = await librariesIO.getDependents(settings.package, settings.pages);
//   const filename = `${process.cwd()}/results/npm/module_${settings.package}_${Date.now()}.json`.replaceAll('\\', '/');
//   fs.writeFileSync(filename, JSON.stringify(modules));
//   console.log(`Successfully outputted package data to ${filename}`);
// })();