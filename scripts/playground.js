(async() => {
  const { GitHub } = require('../lib/github.js');
  const { Files } = require('../lib/files.js');
  const { Format } = require('../lib/format.js');
  const { Metrics } = require('../lib/metrics.js');
  const { NPM } = require('../lib/npm.js');
  const ast = require('abstract-syntax-tree');
  const fs = require('fs');
  const escomplex = require('typhonjs-escomplex');
  const Parser = require('@babel/parser');
  const Traverse = require('@babel/traverse');
  const Types = require('@babel/types');

  const npm = new NPM();
  const files = new Files();
  const gitHub = new GitHub();
  const metrics = new Metrics();
  

  // const code = fs.readFileSync('./projects/version_1/files/caleb531_jcanvas/dist/jcanvas.js').toString();
  // const result = escomplex.analyzeModule(code);
  // fs.writeFileSync('./projects/version_1/complex.json', JSON.stringify(result));

  const code = fs.readFileSync('./projects/version_1/files/petruisfan_node_supervisor/lib/supervisor.js').toString();
  // const code = fs.readFileSync('./lib/files.js', { encoding: 'utf8', flag: 'r' }).toString();
  const tree = metrics.parse(code, './projects/version_1/files/petruisfan_node_supervisor/lib/supervisor.js');
  fs.writeFileSync('./projects/version_1/ast.json', JSON.stringify(tree, null, 2));
  console.log(metrics.imports(['./projects/version_1/files/petruisfan_node_supervisor/lib/supervisor.js']));
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