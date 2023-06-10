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
  const axios = require('axios');

  const npm = new NPM();
  const files = new Files();
  const gitHub = new GitHub();
  const metrics = new Metrics();

  const data = files.json('project', 'repos.json', ['version_1']);
  let js_f = 0, js_b = 0, ts_f = 0, ts_b = 0;
  data.repos.forEach(repo => {
    if (repo.language === 'JavaScript') {
      if (repo.has_frontend === true) js_f++;
      if (repo.has_backend === true) js_b++;
    }
    else {
      if (repo.has_frontend === true) ts_f++;
      if (repo.has_backend === true) ts_b++;
    }
  });
  console.log('JS', js_f, js_b);
  console.log('TS', ts_f, ts_b);


  // let js_c = [], js_p = [];
  // let ts_c = [], ts_p = [];
  // data.repos.forEach(repo => {
  //   if (repo.language === 'JavaScript') {
  //     js_c.push(repo.total_commits);
  //     js_p.push(repo.total_prs);
  //   }
  //   else {
  //     ts_c.push(repo.total_commits);
  //     ts_p.push(repo.total_prs);
  //   }
  // });
  // const js_cr = metrics.valuesFromArr(js_c);
  // const js_pr = metrics.valuesFromArr(js_p);
  // const ts_cr = metrics.valuesFromArr(ts_c);
  // const ts_pr = metrics.valuesFromArr(ts_p);

  // console.log('COMMITS -------------------------------');
  // console.log(`[TOTAL] JS: ${js_cr.total} | TS: ${ts_cr.total}`);
  // console.log(`[MIN] JS: ${js_cr.min} | TS: ${ts_cr.min}`);
  // console.log(`[MAX] JS: ${js_cr.max} | TS: ${ts_cr.max}`);
  // console.log(`[AVG] JS: ${js_cr.avg} | TS: ${ts_cr.avg}`);
  // console.log(`[MED] JS: ${js_cr.med} | TS: ${ts_cr.med}`);
  // console.log('PRS -------------------------------');
  // console.log(`[TOTAL] JS: ${js_pr.total} | TS: ${ts_pr.total}`);
  // console.log(`[MIN] JS: ${js_pr.min} | TS: ${ts_pr.min}`);
  // console.log(`[MAX] JS: ${js_pr.max} | TS: ${ts_pr.max}`);
  // console.log(`[AVG] JS: ${js_pr.avg} | TS: ${ts_pr.avg}`);
  // console.log(`[MED] JS: ${js_pr.med} | TS: ${ts_pr.med}`);


  // const x = [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1];
  // const y = [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,1,1,5,3,1,1,1,1,1,1,1,2,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,6,2,1,1,3,2,1,1,1,1,1,1,2,2,2,1,1,1,1,1,1,2,1,3,5,1,1,1,1,1,1,8,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,7,4,1,12,6,5,1,12,1,1,16,5,1,1,6,2,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,4,1,1,1,2,1,1,1,1,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,2,1,1,2,2,1,2,1,1,1,1,1,1,1,1,1,2,2,1,1,1,1,4,1,1,1,1,1,1,1,1,6,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,2,4,3,1,1,1,1,1,1,1,1,1,5,1,3,1,1,4,1,2,1,13,1,3,1,1,2,1,1,4,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,1,1,1,1,1,1,1,1,1,1,3,1,2,1,6,3,9,1,2,1,6,4,1,1,1,1,1,3,1,1,1,1,1,1,1,1,3,1,1];

  // const response = await axios.post('http://localhost:5000/correlation', {
  //   x: x,
  //   y: y
  // })
  // console.log(response);


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