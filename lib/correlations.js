const fs = require('fs');
const { Files } = require('./files.js');
const SpearmanRHO = require('spearman-rho');
const Statistics = require('statistics.js');

class Correlations {
  constructor() {
    this.files = new Files();
  }

  async calc(values) {
    const stats = new Statistics(values, { test: 'metric', source: 'metric' });
    const result = stats.spearmansRho('test', 'source', true);
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
      // const repoData = this.findRepo(repo, repos);
      // if (!repoData.has_ui_tests) return;
      // Test metrics
      Object.entries(repoMetrics.testConnections).forEach(([testFile, sourceFile]) => {
        if (sourceFile === null || sourceFile === '') return;
        const metricsForPair = (tFile, sFile) => {
          const tmetrics = repoMetrics.test[tFile],
                smetrics = repoMetrics.source[sFile];
          if (!tmetrics || !smetrics) return;
          Object.entries(tmetrics).forEach(([tmetric, tvalues]) => {
            if (tvalues === null) return;
            if (typeof tvalues === 'number') {
              if (tmetric.includes('cov') && tvalues === 0) return;
              Object.entries(smetrics).forEach(([smetric, svalues]) => {
                if (svalues === null) return;
                if (typeof svalues === 'number') {
                  const name = `${tmetric}/${smetric}`;
                  result.test[name] = result.test[name] || [];
                  result.test[name].push({ test: tvalues, source: svalues });
                }
                else {
                  Object.entries(svalues).forEach(([saggr, svalue]) => {
                    if (saggr === 'values' || svalue === null) return;
                    const name = `${tmetric}/${smetric}_${saggr}`;
                    result.test[name] = result.test[name] || [];
                    result.test[name].push({ test: tvalues, source: svalue });
                  });
                }
              });
            }
            else {
              Object.entries(tvalues).forEach(([taggr, tvalue]) => {
                if (taggr === 'values' || tvalue === null) return;
                Object.entries(smetrics).forEach(([smetric, svalues]) => {
                  if (svalues === null) return;
                  if (typeof svalues === 'number') {
                    const name = `${tmetric}_${taggr}/${smetric}`;
                    result.test[name] = result.test[name] || [];
                    result.test[name].push({ test: tvalue, source: svalues });
                  }
                  else {
                    Object.entries(svalues).forEach(([saggr, svalue]) => {
                      if (saggr === 'values' || svalue === null) return;
                      const name = `${tmetric}_${taggr}/${smetric}_${saggr}`;
                      result.test[name] = result.test[name] || [];
                      result.test[name].push({ test: tvalue, source: svalue });
                    });
                  }
                });
              });
            }
          });
        }
        if (testFile === 'OTHER') {
          if (Array.isArray(sourceFile)) {
            sourceFile.forEach(sFile => {
              const pathFixed = sFile.replace(/.*(?=\/projects)/, '.');
              const moduleName = pathFixed.match(/(?<=\/)[^\/]+(?=\.c?[jte]?s[xm]?)/)[0];
              const otherPath = pathFixed.replace(new RegExp(`${moduleName}(?=\.c?[jte]?s[xm]?)`), `OTHER-${moduleName}`);
              metricsForPair(otherPath, sFile);
            });
          }
          else {
            metricsForPair(testFile, sourceFile);
          }
        }
        else {
          metricsForPair(testFile, sourceFile);
        }
      });
      // Performance test metrics
      // Object.entries(repoMetrics.performanceConnections).forEach(([testFile, sourceFile]) => {
      //   if (sourceFile === null || sourceFile === '') return;
      //   const metricsForPair = (tFile, sFile) => {
      //     const tmetrics = repoMetrics.performance[tFile],
      //           smetrics = repoMetrics.source[sFile];
      //     Object.entries(tmetrics).forEach(([tmetric, tvalues]) => {
      //       if (tvalues === null) return;
      //       if (typeof tvalues === 'number') {
      //         if (tmetric.includes('cov') && tvalues === 0) return;
      //         Object.entries(smetrics).forEach(([smetric, svalues]) => {
      //           if (svalues === null) return;
      //           if (typeof svalues === 'number') {
      //             const name = `${tmetric}/${smetric}`;
      //             result.performance[name] = result.performance[name] || [];
      //             result.performance[name].push({ test: tvalues, source: svalues });
      //           }
      //           else {
      //             Object.entries(svalues).forEach(([saggr, svalue]) => {
      //               if (saggr === 'values' || svalue === null) return;
      //               const name = `${tmetric}/${smetric}_${saggr}`;
      //               result.performance[name] = result.performance[name] || [];
      //               result.performance[name].push({ test: tvalues, source: svalue });
      //             });
      //           }
      //         });
      //       }
      //       else {
      //         Object.entries(tvalues).forEach(([taggr, tvalue]) => {
      //           if (taggr === 'values' || tvalue === null) return;
      //           Object.entries(smetrics).forEach(([smetric, svalues]) => {
      //             if (svalues === null) return;
      //             if (typeof svalues === 'number') {
      //               const name = `${tmetric}_${taggr}/${smetric}`;
      //               result.performance[name] = result.performance[name] || [];
      //               result.performance[name].push({ test: tvalue, source: svalues });
      //             }
      //             else {
      //               Object.entries(svalues).forEach(([saggr, svalue]) => {
      //                 if (saggr === 'values' || svalue === null) return;
      //                 const name = `${tmetric}_${taggr}/${smetric}_${saggr}`;
      //                 result.performance[name] = result.performance[name] || [];
      //                 result.performance[name].push({ test: tvalue, source: svalue });
      //               });
      //             }
      //           });
      //         });
      //       }
      //     });
      //   }
      //   if (testFile === 'OTHER') {
      //     sourceFile.forEach(sFile => {
      //       const pathFixed = sFile.replace(/.*(?=\/projects)/, '.');
      //       const moduleName = pathFixed.match(/(?<=\/)[^\/]+(?=\.c?[jte]?s[xm]?)/)[0];
      //       const otherPath = pathFixed.replace(new RegExp(`${moduleName}(?=\.c?[jte]?s[xm]?)`), `OTHER-${moduleName}`);
      //       metricsForPair(otherPath, sFile);
      //     });
      //   }
      //   else {
      //     metricsForPair(testFile, sourceFile);
      //   }
      // });
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
        corrs[testMetricName][sourceMetricName] = { rho: correlation.rho, p: correlation.significanceNormal.pTwoTailed, n: correlation.significanceStudent.degreesOfFreedom };
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