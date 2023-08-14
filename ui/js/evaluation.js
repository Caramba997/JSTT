(function () {
  const search = new URLSearchParams(location.search),
        id = search.get('id');
  if (!id) {
    $('[data-e="error"]').text('Error retrieving results. Check if query param is valid, e.g. ?id=version_1').show();
    return;
  }
  $('[data-e="project-link"]').attr('href', `/ui/project?id=${id}`);
  
  let data, level, repos;

  function buildPage() {
    if (data.correlations) {
      // Test
      const tdata = data.correlations.test;
      const tTable = $('[data-e="correlations-test"]');
      const tBody = tTable.find('tbody');
      const headings = Array.from(Object.keys(tdata.locM));
      let header = '<tr><th scope="col"></th>';
      headings.forEach(key => {
        header = header.concat(`<th scope="col">${key}</th>`);
      });
      header = header.concat('</tr>');
      tTable.find('thead').html(header);
      let tableData = '';
      let tSummary = [];
      let corrButInsig = 0;
      let moderate = 0;
      Object.entries(tdata).forEach(([tmetric, smetrics]) => {
        let index = 0;
        let row = `<tr><th scope="row">${tmetric}</th>`;
        Object.entries(smetrics).forEach(([smetric, value]) => {
          const template = '<td style="background-color: {{color}};" data-bs-toggle="tooltip" data-bs-placement="top" title="{{title}}">{{value}}</td>';
          const colIndex = headings.indexOf(smetric, index);
          if (colIndex > index) {
            do {
              row = row.concat(template.replace('{{color}}', 'black').replace('{{value}}', '').replace('{{title}}', ''));
              index++;
            }
            while (index < colIndex);
          }
          let color = 'lightgrey';
          if (Math.abs(value.rho) >= 0.5) {
            if (Math.abs(value.p) < 0.05) {
              color = `rgb(${((Math.abs(value.rho) - 0.5) * 2) * 255},${Math.abs(value.rho) * 255},${((Math.abs(value.rho) - 0.5) * 2) * 255})`;
              tSummary.push({
                test: tmetric,
                source: smetric,
                rho: value.rho,
                p: value.p,
                n: value.n
              });
            }
            else {
              corrButInsig++;
              color = `rgb(${Math.abs(value.rho) * 255},${((Math.abs(value.rho) - 0.5) * 2) * 255},${((Math.abs(value.rho) - 0.5) * 2) * 255})`;
            }
          }
          else if (Math.abs(value.rho) >= 0.3) {
            if (Math.abs(value.p) < 0.05) {
              moderate++;
              color = `rgb(${((Math.abs(value.rho) - 0.3) * 2) * 255},${((Math.abs(value.rho) - 0.3) * 2) * 255},${Math.abs(value.rho) * 3 * 255})`;
            }
          }
          if (Object.keys(value).length === 0) {
            row = row.concat(template.replace('{{color}}', 'black').replace('{{value}}', '').replace('{{title}}', ''));
          }
          else {
            row = row.concat(template.replace('{{color}}', color).replace('{{value}}', value.rho.toFixed(4)).replace('{{title}}', `${value.p}, n=${value.n}`));
          }
          index++;
        });
        tableData = tableData.concat(row);
      });
      tBody.html(tableData);
      console.log(`Significant correlations: ${tSummary.length}`);
      console.log(`Insignificant correlations: ${corrButInsig}`);
      console.log(`Moderate correlations: ${moderate}`);
      const tSummaryTable = $('[data-e="correlations-test-summary"]');
      let summaryData = '';
      tSummary.forEach((entry) => {
        summaryData = summaryData.concat(`<tr><td>${entry.test}</td><td>${entry.source}</td><td>${entry.rho}</td><td>${entry.p}</td><td>${entry.n}</td></tr>`);
      });
      tSummaryTable.find('tbody').html(summaryData);
      // Performance
      // const pdata = data.correlations.performance;
      // const pTable = $('[data-e="correlations-perf"]');
      // const pBody = pTable.find('tbody');
      // pTable.find('thead').html(header);
      // let perfTableData = '';
      // Object.entries(pdata).forEach(([tmetric, smetrics]) => {
      //   let index = 0;
      //   let row = `<tr><th scope="row">${tmetric}</th>`;
      //   Object.entries(smetrics).forEach(([smetric, value]) => {
      //     const template = '<td style="background-color: {{color}};">{{value}}</td>';
      //     const colIndex = headings.indexOf(smetric, index);
      //     if (colIndex > index) {
      //       do {
      //         row = row.concat(template.replace('{{color}}', 'black').replace('{{value}}', ''));
      //         index++;
      //       }
      //       while (index < colIndex);
      //     }
      //     let color = 'lightgrey';
      //     if (Math.abs(value) >= 0.5) {
      //       color = `rgb(0.5,${Math.abs(value) * 255},0.5)`;
      //     }
      //     row = row.concat(template.replace('{{color}}', color).replace('{{value}}', value.toFixed(4)));
      //     index++;
      //   });
      //   perfTableData = perfTableData.concat(row);
      // });
      // pBody.html(perfTableData);
    }
  }

  function initPageSelector() {
    const selector = $('[name="rank_page"]');
    let html = '';
    const pages = Math.ceil(level.list.length / 100);
    for (let i = 0; i < pages; i++) {
      html += `<option value="${i}">${ i + 1}</option>`;
    }
    selector.html(html);
    $('[data-e="total-files"]').text(pages);
  }

  function buildLevel() {
    const tbody = $('[data-e="file-ranks"] tbody'),
          template = $($('[data-t="file-ranks-row"]').html()),
          page = parseInt($('[name="rank_page"]').val());
    tbody.html('');
    for (let i = 0; i < 100; i++) {
      const index = page * 100 + i,
            fileData = level.list[index],
            html = template.clone();
      const formatNum = (num) => {
        return Math.round(num * 1000) / 1000;
      };
      html.find('[data-e="file-ranks-rank"]').text(fileData.rank);
      html.find('[data-e="file-ranks-normal"]').text(formatNum(fileData.normalizedRank));
      html.find('[data-e="file-ranks-avg"]').text(formatNum(fileData.accumulatedRank));
      html.find('[data-e="file-ranks-repo"]').text(fileData.repo);
      const findRepo = (name) => {
        for (let i = 0; i < repos.repos.length; i++) {
          if (repos.repos[i].full_name === name) return repos.repos[i];
        }
      }
      const repo = findRepo(fileData.repo),
            fileFixed = fileData.file.split('/files/')[1].replace(/[^\/]*\//, '');
      html.find('[data-e="file-ranks-file"]').text(fileFixed);
      html.find('[data-e="file-ranks-git"]').attr('href', `${repo.html_url}/blob/${repo.default_branch}/${fileFixed}`);
      tbody.append(html);
    }
  }

  api.get('evaluation', {
    id: id
  }, async (response) => {
    data = response.data;
    buildPage();
  }, (error) => {
    console.warn(error);
    $('[data-e="error"]').show();
  });

  api.get('level', {
    id: id
  }, async (response) => {
    level = response.data;
    if (!level || Object.keys(level).length === 0) return;
    $('[name="rank_page"]').on('change', buildLevel);
    initPageSelector();
    api.get('repos', {
      id: id
    }, async (response2) => {
      repos = response2.data;
      buildLevel();
    }, (error) => {
      console.warn(error);
      $('[data-e="error"]').show();
    });
  }, (error) => {
    console.warn(error);
    $('[data-e="error"]').show();
  });

  $('[data-a="calc-correlations"]').on('click', async () => {
    progress.init('Calc correlations (Progress in server log)', 1);
    const response = await api.postPromise('calccorrelations', {
      id: id
    });
    data.correlations = response.data.correlations;
    console.log(data.correlations);
    await api.postPromise('evaluation', {
      id: id,
      data: data
    });
    buildPage();
    progress.end();
  });

  $('[data-a="calc-levels"]').on('click', async () => {
    progress.init('Calc testability levels', 1);
    // 1. Find significant source metrics
    const sourceMetrics = new Set();
    Object.values(data.correlations.test).forEach(smetrics => {
      Object.entries(smetrics).forEach(([smetric, value]) => {
        if (Math.abs(value.rho) >= 0.5) {
          if (Math.abs(value.p) < 0.05) {
            sourceMetrics.add(smetric);
          }
        }
      });
    });
    // 2. Collect ranks
    const metrics = await api.getPromise('metrics', {
      id: id
    });
    const ranks = {};
    Object.values(metrics.data.repos).forEach(types => {
      Object.values(types.source).forEach(fileMetrics => {
        Object.entries(fileMetrics).forEach(([metric, value]) => {
          if (value instanceof Object) {
            ranks[metric] = ranks[metric] || {};
            Object.entries(value).forEach(([aggr, aggrValue]) => {
              if (aggr === 'values') return;
              ranks[metric][aggr] = ranks[metric][aggr] || new Set();
              ranks[metric][aggr].add(aggrValue);
            });
          }
          else {
            ranks[metric] = ranks[metric] || new Set();
            ranks[metric].add(value);
          }
        });
      });
    });
    // 3. Sort ranks
    Object.entries(ranks).forEach(([metric, value]) => {
      if (value instanceof Set) {
        ranks[metric] = Array.from(ranks[metric]).sort((a, b) => a - b);
      }
      else {
        Object.entries(value).forEach(([aggr, aggrValue]) => {
          ranks[metric][aggr] = Array.from(ranks[metric][aggr]).sort((a, b) => a - b);
        });
      }
    });
    console.log(ranks);
    // 4. Calc ranks for metrics
    const levels = {};
    Object.entries(metrics.data.repos).forEach(([repo, types]) => {
      levels[repo] = {};
      Object.entries(types.source).forEach(([file, fileMetrics]) => {
        levels[repo][file] = {
          ranks: []
        };
        Object.entries(fileMetrics).forEach(([metric, value]) => {
          if (value instanceof Object) {
            Object.entries(value).forEach(([aggr, aggrValue]) => {
              if (aggr === 'values' || !sourceMetrics.has(`${metric}_${aggr}`)) return;
              levels[repo][file].ranks.push({
                metric: `${metric}_${aggr}`,
                value: aggrValue,
                rank: ranks[metric][aggr].indexOf(aggrValue) + 1
              });
            });
          }
          else {
            if (!sourceMetrics.has(metric)) return;
            levels[repo][file].ranks.push({
              metric: metric,
              value: value,
              rank: ranks[metric].indexOf(value) + 1
            });
          }
        });
      });
    });
    // 5. Accumulate ranks for modules
    Object.values(levels).forEach(files => {
      Object.values(files).forEach(fileData => {
        let rankAcc = 0,
            total = 0;
        fileData.ranks.forEach(rankInfo => {
          rankAcc += rankInfo.rank;
          total++;
        });
        fileData.accumulatedRank = rankAcc / total;
      });
    });
    // 6. Calc final ranks for modules
    let moduleRanks = new Set();
    Object.values(levels).forEach(files => {
      Object.values(files).forEach(fileData => {
        moduleRanks.add(fileData.accumulatedRank);
      });
    });
    moduleRanks = Array.from(moduleRanks).sort((a, b) => a - b);
    const maxRank = moduleRanks[moduleRanks.length - 1];
    Object.values(levels).forEach(files => {
      Object.values(files).forEach(fileData => {
        fileData.rank = moduleRanks.indexOf(fileData.accumulatedRank);
        fileData.normalizedRank = fileData.accumulatedRank / maxRank * 100;
      });
    });
    console.log(levels);
    // 7. Create list of modules sorted by rank
    const list = [];
    Object.entries(levels).forEach(([repo, files]) => {
      Object.entries(files).forEach(([file, fileData]) => {
        list.push({
          repo: repo,
          file: file,
          rank: fileData.rank,
          accumulatedRank: fileData.accumulatedRank,
          normalizedRank: fileData.normalizedRank
        });
        fileData.rank = moduleRanks.indexOf(fileData.accumulatedRank + 1);
        fileData.normalizedRank = fileData.accumulatedRank / maxRank * 100;
      });
    });
    list.sort((a, b) => a.rank - b.rank);
    await api.postPromise('level', {
      id: id,
      data: { repos: levels, list: list }
    });
    progress.end();
  });

})();