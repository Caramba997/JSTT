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
  const equal = require('deep-equal');

  const npm = new NPM();
  const files = new Files();
  const gitHub = new GitHub();
  const metrics = new Metrics();

  const refactorings = files.json('project', 'refactorings.json', ['pavel']).refactorings;
  const commits = files.json('project', 'commits.json', ['pavel']).commits;
  const todos = {
    marked: 0,
    done: 0,
    undone: 0,
    with_tr: 0,
    without_tr: 0,
    with_ref: 0,
    without_ref: 0
  };
  Object.entries(commits).forEach(([repo, repoCommits]) => {
    repoCommits.forEach(commit => {
      const commitRefactorings = refactorings[repo][commit.sha];
      if (commitRefactorings && commitRefactorings.length > 0) {
        todos.with_ref++;
        if (commit.is_done) {
          const trs = commitRefactorings.filter(ref => ref.is_testability_refactoring === true);
          if (trs.length > 0) {
            todos.with_tr++;
            commit.for_pavel = true;
          }
          else {
            todos.without_tr++;
          }
        }
      }
      else {
        todos.without_ref++;
      }
      if (commit.is_marked) {
        todos.marked++;
        commit.for_pavel = true;
        // delete commit.is_marked;
      }
      if (commit.is_done) {
        todos.done++;
        // delete commit.is_done;
      }
      else {
        todos.undone++;
      }
    });
  });
  // Object.values(refactorings.refactorings).forEach(repo => {
  //   Object.values(repo).forEach(commit => {
  //     commit.forEach(refactoring => {
  //       if (refactoring.is_marked) todos.marked++;
  //       if (refactoring.is_done) {
  //         todos.done++;
  //         if (!refactoring.is_testability_refactoring) todos.without_tr++;
  //       }
  //       else {
  //         todos.undone++;
  //       }
  //       if (refactoring.is_testability_refactoring) todos.with_tr++;
  //     });
  //   });
  // });
  // files.write('project', 'refactorings.json', refactorings, ['pavel']);
  console.log(todos);

  // const types = new Set();
  // const refactorings = files.json('project', 'refactorings.json', ['version_1_new']);
  // Object.values(refactorings.refactorings).forEach(repo => {
  //   Object.values(repo).forEach(commit => {
  //     commit.forEach(refactoring => {
  //       types.add(refactoring.type);
  //     });
  //   });
  // });
  // files.write('knowledge', 'refactorings.json', {
  //   types: Array.from(types).sort()
  // });

  // const data = files.json('project', 'commits.json', ['version_1_new']);
  // Object.entries(data.commits).forEach(([repo, commits]) => {
  //   const shas = {};
  //   try {
  //     for (let i = 0; i < commits.length;) {
  //       const commit = commits[i];
  //       if (shas[commit.sha] && equal(commit, shas[commit.sha])) {
  //         commits.splice(i, 1);
  //         continue;
  //       }
  //       shas[commit.sha] = commit;
  //       i++;
  //     }
  //   }
  //   catch (e) {
  //     console.error(e);
  //     console.log(repo, typeof commits);
  //     throw 'Error occured';
  //   }
  // });
  // files.write('project', 'commits.json', data, ['version_1_new']);

  // const data = files.json('project', 'evaluation.json', ['version_1_new']);
  // let str = '';
  // let min = 1;
  // let max = 0;
  // Object.entries(data.correlations.test).forEach(([tmetric, smetrics]) => {
  //   Object.entries(smetrics).forEach(([smetric, values]) => {
  //     if (Math.abs(values.rho) > 0.5) {
  //       min = Math.min(min, Math.abs(values.rho));
  //       max = Math.max(max, Math.abs(values.rho));
  //       str += `${tmetric.replace('_', '\\_')} & ${smetric.replace('_', '\\_')} & ${values.rho.toFixed(4)} & ${`\\num{${values.p}}`.replace(/(?<=\.\d{4})\d+/, '')} \\\\\n`;
  //     }
  //   });
  // });
  // files.write('project', 'str.txt', str, ['version_1_new']);
  // console.log(min, max);



  // let c = 0, p = 0, s = 0;
  // Object.values(data.repos).forEach(repo => {
  //   const test = repo.testConnections;
  //   let hasC = false;
  //   Object.entries(test).forEach(([key, value]) => {
  //     if (value) {
  //       if (key === 'OTHER') {
  //         value.forEach(file => {
  //           c++;
  //           hasC = true;
  //         });
  //       }
  //       else {
  //         c++;
  //         s++;
  //         hasC = true;
  //       }
  //     }
  //   });
  //   if (hasC) p++;
  // });
  // console.log(c, p, s);

  
  // let arr = [], js = [], ts = [];
  // data.repos.forEach(repo => {
  //   if (repo.no_javascript) return;
  //   arr.push(repo.stargazers_count);
  //   if (repo.language === 'JavaScript') {
  //     js.push(repo.stargazers_count);
  //   }
  //   else {
  //     ts.push(repo.stargazers_count);
  //   }
  // });
  // const js_cr = metrics.valuesFromArr(arr);
  // const js_pr = metrics.valuesFromArr(js);
  // const ts_cr = metrics.valuesFromArr(ts);
  // console.log(js_cr);
  // console.log(js_pr);
  // console.log(ts_cr);


  // let t = 0, ti = 0, tf = 0;
  // data.repos.forEach(repo => {
  //   if (repo.no_javascript) return;
  //   if (repo.has_tests) {
  //     t++;
  //   }
  //   if (repo.test_run_impossible) ti++;
  //   if (repo.has_failing_tests) tf++;
  // });
  // console.log(t, ti, tf);

  // const result = {};
  // data.repos.forEach(repo => {
  //   if (repo.categories) {
  //     repo.categories.forEach(fw => {
  //       if (result[fw]) {
  //         result[fw].total++;
  //         result[fw][repo.language]++;
  //       }
  //       else {
  //         result[fw] = {
  //           name: fw,
  //           total: 1,
  //           JavaScript: 0,
  //           TypeScript: 0
  //         }
  //         result[fw][repo.language]++;
  //       }
  //     });
  //   }
  // });
  // let arr = Array.from(Object.values(result)).sort((a, b) => b.total - a.total);
  // let str = '';
  // arr.forEach(entry => {
  //   str += `${entry.name} & ${entry.total} & ${entry.JavaScript} & ${entry.TypeScript} \\\\\n`;
  // });
  // files.write('project', 'fw.json', str, ['version_1']);
  // console.log(arr);


  // let js_c = [], js_p = [];
  // let ts_c = [], ts_p = [];
  // let total_c = 0, total_p = 0;
  // data.repos.forEach(repo => {
  //   if (repo.no_javascript) return;
  //   total_c += repo.total_commits;
  //   total_p += repo.total_prs;
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
  // console.log(total_c);
  // console.log(`[TOTAL] JS: ${js_cr.total} | TS: ${ts_cr.total}`);
  // console.log(`[MIN] JS: ${js_cr.min} | TS: ${ts_cr.min}`);
  // console.log(`[MAX] JS: ${js_cr.max} | TS: ${ts_cr.max}`);
  // console.log(`[AVG] JS: ${js_cr.avg} | TS: ${ts_cr.avg}`);
  // console.log(`[MED] JS: ${js_cr.med} | TS: ${ts_cr.med}`);
  // console.log('PRS -------------------------------');
  // console.log(total_p);
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