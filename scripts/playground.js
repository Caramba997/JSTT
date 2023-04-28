(async() => {
  const { GitHub } = require('../lib/github.js');
  const { Files } = require('../lib/files.js');
  const { Format } = require('../lib/format.js');
  const { Metrics } = require('../lib/metrics.js');
  const { NPM } = require('../lib/npm.js');
  const ast = require('abstract-syntax-tree');
  const fs = require('fs');
  const escomplex = require('typhonjs-escomplex');
  const babelParser = require("@babel/parser");

  const npm = new NPM();
  const files = new Files();
  const gitHub = new GitHub();
  const metrics = new Metrics();
  

  // const code = fs.readFileSync('./projects/version_1/files/caleb531_jcanvas/dist/jcanvas.js').toString();
  // const result = escomplex.analyzeModule(code);
  // fs.writeFileSync('./projects/version_1/complex.json', JSON.stringify(result));

  // const code = fs.readFileSync('./projects/version_1/files/ForbesLindesay_throat/test/typescript-example.ts').toString();
  const code = fs.readFileSync('./projects/version_1/files/ForbesLindesay_throat/index.d.ts', { encoding: 'utf8', flag: 'r' }).toString();
  const tree = babelParser.parse(code, {
    sourceType: 'unambiguous',
    plugins: [
      [
        'typescript',
        {
          'dts': true
        }
      ],
      'jsx',
      'estree'
    ]
  });
  console.log(ast.count(tree, 'CallExpression'));
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