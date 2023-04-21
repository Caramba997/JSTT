(async() => {
  const { GitHub } = require('../lib/github.js');
  const { Files } = require('../lib/files.js');
  const { Format } = require('../lib/format.js');
  const { Metrics } = require('../lib/metrics.js');
  const { NPM } = require('../lib/npm.js');
  const ast = require('abstract-syntax-tree');
  const fs = require('fs');

  const npm = new NPM();
  const files = new Files();
  const gitHub = new GitHub();
  const metrics = new Metrics();

  files.clean(files.path('files', '', ['version_1', 'petruisfan_node_supervisor']));
  // const source = fs.readFileSync('./lib/ast.js').toString();
  // const tree = ast.parse(metrics.clean(source));
  // ast.traverse(tree, {
  //   enter (node) {
  //     console.log(node.type);
  //   },
  // });
  // const tree = ast.parse(source);
  // files.write('project', 'ast.json', tree, ['version_1']);
  // let currentLevel = 0,
  //     maxLevel = 0;
  // const blockTypes = ['BlockStatement', 'ClassBody', 'FunctionBody'];
  // ast.traverse(tree, {
  //   enter (node) {
  //     console.log(node.type);
  //     if (blockTypes.includes(node.type)) currentLevel++;
  //     maxLevel = Math.max(currentLevel, maxLevel);
  //   },
  //   leave (node) {
  //     if (blockTypes.includes(node.type)) currentLevel--;
  //   }
  // });
  // console.log(maxLevel);

  // const comp = metrics.complexity('./projects/version_1/files/nparashuram_seamcarving/main.js');
  // console.log(comp);

  // const data = files.json('project', 'metrics-__projects_version_1_files_petruisfan_node_supervisor_lib_supervisor_js.json', ['version_1']);
  // let total = 0,
  //     sum = 0;
  // data.methods.forEach((method) => {
  //   total++;
  //   sum += method.sloc.logical;
  // });
  // console.log(sum / total, data.aggregateAverage.sloc.logical);

  // const dirs = files.getFilePaths('./projects/version_1/files/petruisfan_node_supervisor/');
  // console.log(dirs);

  // const { FileTypes } = require('../lib/format.js');
  // console.log(FileTypes);
  // const files = new Files();
  // console.log(files.hasTests('./projects/version_1/files/petruisfan_node_supervisor/'));

  // const gitHub = new GitHub();
  // const files = new Files();
  // const response = await gitHub.getRepositoryBySearch('language:TypeScript+created:2023-03-10T08:21:45..2023-03-10T11:30:02+pushed:>2022-04-11', 710);
  // files.write('project', 'missing.json', response, ['active_projects']);


  // const response = await gitHub.searchFileInRepo('meisterplayer/media-dash', 'package', 'json');
  // console.log(response);
  // if (response.data.total_count > 0) {
  //   if (response.data.total_count > 1) {
  //     console.log(`Warning: Multiple occurences of package.json found`);
  //   }
  //   const package_json = await gitHub.getFile(data.name, data.owner.login, response.data.items[0].path),
  //         decoded = (package_json.data.encoding !== 'utf-8') ? Buffer.from(package_json.data.content, package_json.data.encoding).toString('utf-8').replace(/\,(?=\s*?[\}\]])/g, '') : package_json.data.content;
  //   console.log(JSON.parse(decoded));
  // }
  // else {
  //   console.log('Not found');
  // }

  // const file = await gitHub.getFile('herbowicz', 'create-react-app', 'package.json');
  // const package_json2 = await gitHub.getFile(data.name, data.owner.login, response.data.items[0].path),
  //             decoded2 = (package_json2.data.encoding !== 'utf-8') ? Buffer.from(package_json2.data.content, package_json2.data.encoding).toString('utf-8').replace(/\,(?=\s*?[\}\]])/g, '') : package_json2.data.content;
  // console.log(file);
})();