const fs = require('fs');
const { Files } = require('./files.js');
const SpearmanRHO = require('spearman-rho');
const Statistics = require('statistics.js');

class Correlations {
  constructor() {
    this.files = new Files();
    this.skip = {
      noM: ['avg','med','min','max'],
      ccM: ['total'],
      hbugsM: ['total'],
      hdiffM: ['total'],
      heffortM: ['total'],
      hlengthM: ['total'],
      hTimeM: ['total'],
      hvocabM: ['total'],
      hvolM: ['total'],
      maintainM: ['total'],
      nofM: ['total'],
      noF: ['avg','med','min','max'],
      ccF: ['total'],
      hbugsF: ['total'],
      hdiffF: ['total'],
      heffortF: ['total'],
      hlengthF: ['total'],
      hTimeF: ['total'],
      hvocabF: ['total'],
      hvolF: ['total'],
      paramF: ['total'],
      lcovM: ['total'],
      scovM: ['total'],
      fcovM: ['total'],
      bcovM: ['total']
    }
  }

  async calc(values) {
    const stats = new Statistics(values, { test: 'metric', source: 'metric' });
    const result = stats.spearmansRho('test', 'source', false);
    return result;
  }

  findRepo(name, repos) {
    for (let i = 0; i < repos.length; i++) {
      // console.log(repos[i].full_name, name);
      if (repos[i].full_name === name) return repos[i];
    }
    return null;
  }

  async project(metrics, repos) {
    const repoCount = Object.keys(metrics.repos).length;
    const result = {
      test: {},
      performance: {},
    };
    let current = 1;
    process.stdout.write('\nCreating correlation data...\n');
    process.stdout.write(`0/${repoCount}`);
    Object.entries(metrics.repos).forEach(async ([repo, repoMetrics]) => {
      const repoData = this.findRepo(repo, repos);
      // if (!repoData.has_ui_tests) return;
      // Test metrics
      if (repoMetrics.source && repoMetrics.test && repoMetrics.test.locM && repoMetrics.test.locM.total) {
        Object.entries(repoMetrics.test).forEach(([tmetric, tvalues]) => {
          if (tvalues) {
            Object.entries(tvalues).forEach(([taggr, tvalue]) => {
              if (!(this.skip[tmetric] && this.skip[tmetric].includes(taggr)) && taggr !== 'values' && tvalue !== null) {
                Object.entries(repoMetrics.source).forEach(([smetric, svalues]) => {
                  if (svalues) {
                    Object.entries(svalues).forEach(([saggr, svalue]) => {
                      if (!(this.skip[smetric] && this.skip[smetric].includes(saggr)) && saggr !== 'values' && svalue !== null) {
                        const name = `${tmetric}_${taggr}/${smetric}_${saggr}`;
                        result.test[name] = result.test[name] || [];
                        result.test[name].push({ test: tvalue, source: svalue });
                      }
                    });
                  }
                });
              }
            });
          }
        });
      }
      // Performance test metrics
      // if (repoMetrics.source && repoMetrics.performance && repoMetrics.performance.locM && repoMetrics.performance.locM.total) {
      //   Object.entries(repoMetrics.performance).forEach(([tmetric, tvalues]) => {
      //     if (tvalues) {
      //       Object.entries(tvalues).forEach(([taggr, tvalue]) => {
      //         if (!(this.skip[tmetric] && this.skip[tmetric].includes(taggr)) && taggr !== 'values' && tvalue !== null) {
      //           Object.entries(repoMetrics.source).forEach(([smetric, svalues]) => {
      //             if (svalues) {
      //               Object.entries(svalues).forEach(([saggr, svalue]) => {
      //                 if (!(this.skip[smetric] && this.skip[smetric].includes(saggr)) && saggr !== 'values' && svalue !== null) {
      //                   const name = `${tmetric}_${taggr}/${smetric}_${saggr}`;
      //                   result.performance[name] = result.performance[name] || { test: [], source: [] };
      //                   result.performance[name].test.push(tvalue);
      //                   result.performance[name].source.push(svalue);
      //                 }
      //               });
      //             }
      //           });
      //         }
      //       });
      //     }
      //   });
      // }
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
      process.stdout.write(`${current}/${repoCount}`);
      current++;
    });
    const corrCount = Object.keys(result.test).length + Object.keys(result.performance).length;
    current = 1;
    process.stdout.write('\n');
    process.stdout.write('Calculating correlations...\n');
    process.stdout.write(`0/${corrCount}`);
    const correlations = {};
    for (const type in result) {
      const pairs = result[type];
      const corrs = {};
      for (const pair in pairs) {
        const values = pairs[pair];
        const correlation = await this.calc(values);
        const testMetricName = pair.split('/')[0],
              sourceMetricName = pair.split('/')[1];
        corrs[testMetricName] = corrs[testMetricName] || {};
        corrs[testMetricName][sourceMetricName] = { rho: correlation.rho, p: correlation.significanceStudent.pTwoTailed, n: correlation.significanceStudent.degreesOfFreedom };
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
        process.stdout.write(`${current}/${corrCount}`);
        current++;
      }
      correlations[type] = corrs;
    }
    process.stdout.write('\n');
    return correlations;
  }

}

module.exports = { Correlations };