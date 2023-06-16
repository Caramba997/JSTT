(function () {
  const search = new URLSearchParams(location.search),
        id = search.get('id');
  if (!id) {
    $('[data-e="error"]').text('Error retrieving results. Check if query param is valid, e.g. ?id=version_1').show();
    return;
  }
  $('[data-e="project-link"]').attr('href', `/ui/project?id=${id}`);
  
  let data;

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

  api.get('evaluation', {
    id: id
  }, async (response) => {
    data = response.data;
    buildPage();
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

})();