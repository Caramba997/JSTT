(async() => {
  const { GitHub } = require('../lib/github.js');
  const { Files } = require('../lib/files.js');
  const { Format } = require('../lib/format.js');
  const { Metrics } = require('../lib/metrics.js');
  const { NPM } = require('../lib/npm.js');
  const fs = require('fs');
  const escomplex = require('typhonjs-escomplex');
  const Parser = require('@babel/parser');
  const Traverse = require('@babel/traverse');
  const Types = require('@babel/types');
  const SpearmanRHO = require('spearman-rho');
  const { PythonShell } = require('python-shell');
  const axios = require('axios');

  const npm = new NPM();
  const files = new Files();
  const gitHub = new GitHub();
  const metrics = new Metrics();

  const x = [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1];
  const y = [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,1,1,5,3,1,1,1,1,1,1,1,2,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,6,2,1,1,3,2,1,1,1,1,1,1,2,2,2,1,1,1,1,1,1,2,1,3,5,1,1,1,1,1,1,8,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,7,4,1,12,6,5,1,12,1,1,16,5,1,1,6,2,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,4,1,1,1,2,1,1,1,1,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,2,1,1,2,2,1,2,1,1,1,1,1,1,1,1,1,2,2,1,1,1,1,4,1,1,1,1,1,1,1,1,6,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,2,4,3,1,1,1,1,1,1,1,1,1,5,1,3,1,1,4,1,2,1,13,1,3,1,1,2,1,1,4,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,1,1,1,1,1,1,1,1,1,1,3,1,2,1,6,3,9,1,2,1,6,4,1,1,1,1,1,3,1,1,1,1,1,1,1,1,3,1,1];

  const response = await axios.post('http://localhost:5000/correlation', {
    x: x,
    y: y
  })
  console.log(response);


  // const data = files.json('project', 'repos.json', ['version_1_new']);
  // const newData = { repos: [] };
  // for (let i = 0; i < data.repos.length; i++) {
  //   const repo = data.repos[i];
  //   if (repo.has_tests) {
  //     repo.is_done = false;
  //     newData.repos.push(repo);
  //   }
  // }
  // files.write('project', 'repos.json', newData, ['version_1_new']);

  // const data = files.json('project', 'metrics.json', ['version_1']);
  // Object.entries(data.repos).forEach(async ([repo, repoMetrics]) => {
  //   let misses = [];
  //   Object.entries(repoMetrics.source).forEach(([tmetric, tvalues]) => {
  //     if (!tvalues) console.log(`No source metrics for ${tmetric}`);
  //     Object.entries(tvalues).forEach(([taggr, tvalue]) => {
  //       if (tvalue === null) {
  //         misses.push(`${tmetric}_${taggr}`);
  //       }
  //     });
  //   });
  //   if (misses.length > 0) {
  //     console.log(`--> ${repo}: ${misses.join(',')}\n`);
  //   }
  // });
  
  // const rho = new SpearmanRHO([0,1,2,3,4,5],[0,6,6,6,6,7]);
  // rho.calc()
  // .then(value => console.log(value))
  // .catch(err => console.error(err));

  // const code = fs.readFileSync('./projects/version_1/files/caleb531_jcanvas/dist/jcanvas.js').toString();
  // const result = escomplex.analyzeModule(code);
  // fs.writeFileSync('./projects/version_1/complex.json', JSON.stringify(result));

  // const code = fs.readFileSync('./projects/version_1/files/nyuichi_lisp_jsx/lisp.jsx').toString();
  // const code = fs.readFileSync('./lib/files.js', { encoding: 'utf8', flag: 'r' }).toString();
  // const tree = metrics.parse(code, './projects/version_1/files/nyuichi_lisp_jsx/lisp.jsx');
  // fs.writeFileSync('./projects/version_1/ast.json', JSON.stringify(tree, null, 2));
  // console.log(metrics.imports(['./projects/version_1/files/petruisfan_node_supervisor/lib/supervisor.js']));
  // console.log(metrics.depth(tree), metrics.calls(tree));
  // metrics.complexityRepo('./projects/version_1/files/ForbesLindesay_throat/')
  // console.log(ast.count(tree, 'CallExpression'));
  // const parsed = babelParser.parse(code, {
  //   sourceType: 'unambiguous',
  //   plugins: [
  //     [
  //       'typescript',
  //       {
  //         'dts': true
  //       }
  //     ],
  //     'jsx'
  //   ]
  // });
  // const report = escomplex.analyzeModule(code, {
  //   sourceType: 'unambiguous',
  //   plugins: [
  //     [
  //       'typescript',
  //       {
  //         'dts': true
  //       }
  //     ],
  //     'jsx'
  //   ]
  // });
  // const report = escomplex.analyzeModule(code);
  // const report = metrics.complexity(code);
  // console.log(escomplex._escomplexModule._plugins._pluginManager);
  // console.log(report.aggregate);

  // https://github.com/buxlabs/abstract-syntax-tree
  // https://www.npmjs.com/package/@babel/parser
  // https://babel.dev/docs/babel-parser
  // https://babeljs.io/docs/plugins/
})();