(async() => {
  const { GitHub } = require('../lib/github.js');
  const { Files } = require('../lib/files.js');
  const { Format } = require('../lib/format.js');
  const { Metrics } = require('../lib/metrics.js');
  const { NPM } = require('../lib/npm.js');
  
  // const metrics = new Metrics();
  // metrics.complexity('./projects/version_1/files/nparashuram_seamcarving/main.js');

  // const { FileTypes } = require('../lib/format.js');
  // console.log(FileTypes);
  // const files = new Files();
  // console.log(files.hasTests('./projects/version_1/files/petruisfan_node_supervisor/'));

  // const gitHub = new GitHub();
  // const files = new Files();
  // const response = await gitHub.getRepositoryBySearch('language:TypeScript+created:2023-03-10T08:21:45..2023-03-10T11:30:02+pushed:>2022-04-11', 710);
  // files.write('project', 'missing.json', response, ['active_projects']);

  const npm = new NPM();
  const files = new Files();
  const all = await npm.getAllDocs(files.path('project', 'all.json', ['npm']));
  // files.write('project', 'all.json', JSON.stringify(all), ['npm']);
})();