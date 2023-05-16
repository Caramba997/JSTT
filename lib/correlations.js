const fs = require('fs');
const { Files } = require('./files.js');
const SpearmanRHO = require('spearman-rho');

class Correlations {
  constructor() {
    this.files = new Files();
  }

  async calc(values) {
    const rho = new SpearmanRHO(values.test, values.source);
    const result = await new Promise((resolve, reject) => {
      rho.calc()
        .then(value => resolve(value))
        .catch(err => {
          console.error(err);
          resolve(null);
        });
    });
    return result;
  }

  async project(metrics) {
    const repoCount = Object.keys(metrics.repos).length;
    const result = {
      test: {},
      performance: {},
    };
    let current = 1;
    process.stdout.write('\nCreating correlation data...\n');
    process.stdout.write(`0/${repoCount}`);
    Object.entries(metrics.repos).forEach(async ([repo, repoMetrics]) => {
      // Test metrics
      if (repoMetrics.source && repoMetrics.test && repoMetrics.test.locM && repoMetrics.test.locM.total) {
        Object.entries(repoMetrics.test).forEach(([tmetric, tvalues]) => {
          if (tvalues) {
            Object.entries(tvalues).forEach(([taggr, tvalue]) => {
              if (taggr !== 'values' && tvalue !== null) {
                Object.entries(repoMetrics.source).forEach(([smetric, svalues]) => {
                  if (svalues) {
                    Object.entries(svalues).forEach(([saggr, svalue]) => {
                      if (saggr !== 'values' && svalue !== null) {
                        const name = `${tmetric}_${taggr}/${smetric}_${saggr}`;
                        result.test[name] = result.test[name] || { test: [], source: [] };
                        result.test[name].test.push(tvalue);
                        result.test[name].source.push(svalue);
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
      if (repoMetrics.source && repoMetrics.performance && repoMetrics.performance.locM && repoMetrics.performance.locM.total) {
        Object.entries(repoMetrics.performance).forEach(([tmetric, tvalues]) => {
          if (tvalues) {
            Object.entries(tvalues).forEach(([taggr, tvalue]) => {
              if (taggr !== 'values' && tvalue !== null) {
                Object.entries(repoMetrics.source).forEach(([smetric, svalues]) => {
                  if (svalues) {
                    Object.entries(svalues).forEach(([saggr, svalue]) => {
                      if (saggr !== 'values' && svalue !== null) {
                        const name = `${tmetric}_${taggr}/${smetric}_${saggr}`;
                        result.performance[name] = result.performance[name] || { test: [], source: [] };
                        result.performance[name].test.push(tvalue);
                        result.performance[name].source.push(svalue);
                      }
                    });
                  }
                });
              }
            });
          }
        });
      }
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
        corrs[testMetricName][sourceMetricName] = correlation;
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