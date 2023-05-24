(function () {
  const search = new URLSearchParams(location.search),
        id = search.get('id'),
        repo = search.get('repo');
  if (!id || !repo) {
    $('[data-e="error"]').text('Error retrieving repo. Check if query params are valid, e.g. ?id=version_1&repo=nparashuram/seamcarving').show();
    return;
  }
  $('[data-e="project-link"]').attr('href', `/ui/project?id=${id}`);
  $('[data-e="repos-link"]').attr('href', `/ui/repos?id=${id}`);

  let data, metrics, definitions;

  async function buildPage() {
    $('[data-e="github-link"]').attr('href', data.html_url);
    $('[data-e="info-name"]').text(data.name);
    $('[data-e="info-owner"]').text(data.owner.login);
    $('[data-e="info-language"]').text(data.language);
    $('[data-e="info-stars"]').text(data.stargazers_count);
    $('[data-e="info-created"]').text(data.created_at);
    $('[data-e="info-modified"]').text(data.updated_at);
    if (data.local_folder !== undefined) $('[data-a="download"]').addClass('bg-success-subtle');
    if (data.multiple_package_json) $('[data-e="multiple-package-json"]').show();
    if (data.total_commits !== undefined) $('[data-e="info-commits"]').text(data.total_commits);
    if (data.total_prs !== undefined) $('[data-e="info-prs"]').text(data.total_prs);
    if (data.is_npm === true) {
      if (data.multiple_package_json) {
        $('[data-e="info-npm"]').text('TODO: Select from multiple package.json');
      }
      else {
        $('[data-e="info-npm"]').html('<i class="fa-solid fa-check"></i>');
      }
    }
    else if (data.is_npm === false) {
      $('[data-e="info-npm"]').html('<i class="fa-solid fa-xmark"></i>');
    }
    let depCount = 0,
        deps = [];
    if (data.package_json !== undefined && !data.multiple_package_json) {
      if (data.package_json.dependencies) {
        Object.keys(data.package_json.dependencies).forEach((dep) => {
          depCount++;
          deps.push(dep);
        });
      }
      if (data.package_json.devDependencies) {
        Object.keys(data.package_json.devDependencies).forEach((dep) => {
          depCount++;
          deps.push(dep);
        });
      }
    }
    else if (!data.is_npm && data.dependencies !== undefined) {
      depCount = data.dependencies.length;
      deps = data.dependencies;
    }
    $('[data-e="info-deps"]').text(depCount).attr('title', deps.join('\n'));
    if (data.has_tests === true) {
      const hasTestsElement = $('[data-e="info-tests"]');
      hasTestsElement.html('<i class="fa-solid fa-check"></i>');
      if (data.test_occurences) hasTestsElement.attr('title', `${data.test_occurences.dirs.join('\n')}\n\n${data.test_occurences.files.join('\n')}`);
    }
    else if (data.has_tests === false) {
      $('[data-e="info-tests"]').html('<i class="fa-solid fa-xmark"></i>')
    }
    if (data.is_done === true) {
      $('[data-a="done"]').removeClass('btn-danger').addClass('btn-success').html('<i class="fa-solid fa-check"></i>');
    }
    if (data.has_performance_tests) {
      $('[data-e="performance-section"]').show();
      forms.fromJson($('[data-e="performance"]'), data.performance_test_occurences);
      if (data.has_performance_metrics) $('[data-a="calc-perf-metrics"').addClass('bg-success-subtle');
    }
    if (metrics) {
      $('#manual button').prop('disabled', false);
      if (!definitions) {
        const defResponse = await api.getPromise('metricdefs');
        definitions = defResponse.data;
      }
      Object.entries(metrics).forEach(([category, mtrcs]) => {
        if (category === 'test' && !data.has_tests) return;
        const element = $(`[data-e="${category}-metrics-json"]`);
        element.val(JSON.stringify(mtrcs, null, 2));
      });
      function addConnectionRows(tbody, data) {
        let html = '';
        let hasOther = false;
        Object.entries(data).forEach(([testPath, sourcePath]) => {
          if (testPath === 'OTHER') {
            html += `<tr><td>${testPath}</td><td><input name="${testPath}" class="form-control" type="text" data-type="array" value="${sourcePath || ''}" data-form-skip="skip"><select class="form-select"></select></td></tr>`;
            hasOther = true;
          }
          else {
            html += `<tr><td>${testPath}</td><td><input name="${testPath}" class="form-control" type="text" value="${sourcePath || ''}" data-form-skip="skip"><select class="form-select"></select></td></tr>`;
          }
        });
        if (!hasOther) html += '<tr><td>OTHER</td><td><input name="OTHER" class="form-control" type="text" data-form-skip="skip"><select class="form-select"></select></td></tr>';
        tbody.html(html);
      }
      function initSelects(tbody, sourceData) {
        let selectHtml = '<option value="...">...</option>';
        Object.keys(sourceData).forEach(path => {
          selectHtml += `<option value="${path}">${path}</option>`;
        });
        tbody.find('select').html(selectHtml).on('change', (e) => {
          if (e.target.value === '...') return;
          const input = $(e.target).closest('tr').find('input');
          if (input.attr('name') === 'OTHER') {
            if (input.val().includes(e.target.value)) return;
            if (input.val()) input.val(input.val() + ',');
            input.val(input.val() + e.target.value);
          }
          else {
            input.val(e.target.value);
          }
          input.data('form-skip', 'set');
        });
      }
      if (metrics.test && metrics.test != {}) {
        const tbody = $('[data-e="connections-test"] tbody');
        addConnectionRows(tbody, metrics.testConnections);
        initSelects(tbody, metrics.source);

        // NTC
        let ntcHtml = '';
        Object.entries(metrics.test).forEach(([path, mtrcs]) => {
          if (mtrcs.notcM !== undefined) {
            ntcHtml += `<tr><td>${path}</td><td><input name="${path}" type="number" value="${mtrcs.notcM}" class="form-control" data-form-skip="skip"></td></tr>`
          }
          else {
            ntcHtml += `<tr><td>${path}</td><td><input name="${path}" type="number" class="form-control" data-form-skip="skip"></td></tr>`
          }
        });
        if (ntcHtml !== '') $('[data-e="manual-test"] tbody').html(ntcHtml);
      }
      if (metrics.performance) {
        $('[data-e="performance-test-connections"]').show();
        const tbody = $('[data-e="connections-performance"] tbody')
        addConnectionRows(tbody, metrics.performanceConnections);
        initSelects(tbody, metrics.source);
      }
      // Insert values into manual metric elements
      const manualMetricElements = $('[data-e="manual-test"] [data-name]');
      manualMetricElements.each((index, elem) => {
        elem = $(elem);
        const metric = elem.data('name'),
              data = metrics.test && metrics.test[metric];
        if (!data) return;
        Object.entries(data).forEach(([key, value]) => {
          const dataElem = elem.find(`[data-value="${key}"]`);
          if (dataElem.length === 0) return;
          const valueF = value instanceof Array ? value.join(',') : value;
          if (['INPUT', 'SELECT', 'TEXTAREA'].includes(dataElem.prop("tagName"))) {
            dataElem.val(valueF);
          }
          else {
            dataElem.text(valueF);
          }
        })
      });
      let frameworks = await api.getPromise('frameworks');
      if (frameworks) frameworks = frameworks.data.frameworks.sort();
      if (frameworks.length > 0) {
        const selectElem = $('[data-e="frameworks"]'),
              template = $($('[data-t="frameworks-item"]').html());
        selectElem.html('<option>...</option>');
        frameworks.forEach((category) => {
          const html = template.clone(true);
          html.val(category);
          html.text(category);
          selectElem.append(html);
        });
      }
      if (metrics.performance) {
        $(`[data-e="performance-test-metrics"]`).show();
        const element = $('[data-e="metrics-performance"] tbody');
        element.html('');
        Object.entries(metrics.performance).forEach(([name, values]) => {
          const metric = name.match(/[a-z]+/)[0],
                scope = name.match(/[A-Z]/)[0] === 'M' ? 'Module' : 'Function';
          const def = definitions[metric] || { name: '?', description: '?'},
                tooltip = `<b>${def.name}</b><br><em>Scope: ${scope}</em><br>${def.description}`;
          let cells = `<tr data-name="${name}"><td scope="row" data-bs-toggle="tooltip" data-bs-placement="right" data-bs-html="true" title="${tooltip}">${name}</td>`;
          Object.entries(values).forEach(([type, value]) => {
            const formatValue = (val) => {
              const valueS = val !== null ? `${val}`.split('.') : '?';
              return valueS.length === 2 ? `${val.toFixed(3)}`.replace(/(\.0+|(?<=\.[1-9])0+|(?<=\.[0-9][1-9])0+)$/, '') : `${val}`;
            };
            if (value instanceof Array) {
              const arr = value.map(formatValue);
              cells += `<td data-type="${type}"><textarea rows="1" cols="50" class="form-control">${arr.join(', ')}</textarea></td>`;
            }
            else {
              cells += `<td data-type="${type}">${formatValue(value)}</td>`;
            }
          });
          cells += '</tr>';
          element.append(cells);
        });
      }
    }
    else {
      $('#manual button').prop('disabled', true);
    }
    forms.fromJson($('[data-e="manual-classification"]'), data);
    let categories = await api.getPromise('categories');
    if (categories) {
      categories = categories.data.categories.sort();
      if (categories.length > 0) {
        const selectElem = $('[data-e="categories"]'),
              template = $($('[data-t="categories-item"]').html());
        selectElem.html('<option>...</option>');
        categories.forEach((category) => {
          const html = template.clone(true);
          html.val(category);
          html.text(category);
          selectElem.append(html);
        });
      }
    }
    let dependencies = await api.getPromise('knowndependencies');
    if (dependencies) {
      dependencies = dependencies.data.dependencies.sort();
      if (dependencies.length > 0) {
        const selectElem = $('[data-e="dependencies"]'),
              template = $($('[data-t="dependencies-item"]').html());
        selectElem.html('<option>...</option>');
        dependencies.forEach((dependency) => {
          const html = template.clone(true);
          html.val(dependency);
          html.text(dependency);
          selectElem.append(html);
        });
      }
    }
    // Create path to local directory
    const path = `D:/Projekte/Master/GitHub-Data-Collector/projects/${id}/files/${data.local_folder || ''}`;
    $('[data-e="local-directory"]').text(path);
    const oldPath = `D:/Projekte/Master/GitHub-Data-Collector/projects/${id.replace('_new', '')}/files/${data.local_folder || ''}`;
    $('[data-e="local-directory-old"]').text(oldPath);

    // Set attribute when a manual metric input element changed
    $('[data-e="manual-test"] [name], [data-e="performance"] [name], [data-e="connections-test"] [name], [data-e="connections-performance"] [name]').on('change keyup paste', (e) => {
      $(e.target).data('form-skip', 'set');
    });

    // Init tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
      return new bootstrap.Tooltip(tooltipTriggerEl);
    });
  }

  api.get('repo', {
    id: id,
    repo: encodeURIComponent(repo)
  }, async (response) => {
    data = response.data;
    $('#navbarSupportedContent [data-a]').prop('disabled', false);
    api.get('metrics', {
      id: id,
      repo: encodeURIComponent(repo)
    }, (response) => {
      metrics = response.data;
      buildPage();
    }, (error) => {
      console.warn(error);
      buildPage();
      $('[data-e="error-load"]').show();
    });
  }, (error) => {
    console.warn(error);
    $('[data-e="error-load"]').show();
  });

  const knowledgeSelectors = $('[data-e="categories"], [data-e="frameworks"], [data-e="dependencies"]');
  knowledgeSelectors.on('change', (e) => {
    const element = $(e.target);
    const value = element.val();
    if (!value || value === '...') return;
    const input = element.closest('td').find('input');
    if (!input.val().includes(value)) {
      let text = input.val();
      if (text !== '') text += ',';
      text += value;
      input.val(text);
    }
  });

  $('[data-a="download"]').on('click', async () => {
    progress.init('Download repo', 1);
    const response = await api.postPromise('downloadrepo', {
      id: id,
      repo: repo
    });
    if (!response) {
      const alert = $('[data-e="error"]');
      alert.html('Error downloading repo').show();
      setTimeout(() => {
        alert.hide();
      }, 5000);
    }
    data.local_folder = response.data.localFolder;
    await api.postPromise('repo', {
      id: id,
      data: data
    });
    $('[data-a="download"]').addClass('bg-success-subtle');
    progress.setProgress(1, 1);
    progress.end();
  });

  $('[data-a="check-tests"]').on('click', async () => {
    progress.init('Check tests', 1);
    const response = await api.postPromise('checktests', {
      id: id,
      repo: repo
    });
    data.has_tests = response.data.has_tests;
    if (response.data.has_tests) data.test_occurences = response.data.test_occurences;
    data.has_performance_tests = response.data.has_performance_tests;
    if (response.data.has_performance_tests) data.performance_test_occurences = response.data.performance_test_occurences;
    await api.postPromise('repo', {
      id: id,
      data: data
    });
    progress.setProgress(1, 1);
    buildPage();
    progress.end();
  });

  $('[data-a="calc-metrics"]').on('click', async () => {
    progress.init('Calc metrics', 1);
    const response = await api.postPromise('calcmetrics', {
      id: id,
      repo: repo
    });
    const responseMetrics = response.data;
    Object.entries(responseMetrics).forEach(([type, paths]) => {
      Object.entries(paths).forEach(([path, mtrcs]) => {
        metrics[type][path] = mtrcs;
      });
    });
    await api.postPromise('metrics', {
      id: id,
      repo: repo,
      data: metrics
    });
    data.has_metrics = true;
    await api.postPromise('repo', {
      id: id,
      data: data
    });
    progress.setProgress(1, 1);
    buildPage();
    progress.end();
  });

  $('[data-a="calc-perf-metrics"]').on('click', async () => {
    progress.init('Calc performance metrics', 1);
    const response = await api.postPromise('calcperfmetrics', {
      id: id,
      repo: repo,
      paths: data.performance_test_occurences
    });
    const responseMetrics = response.data;
    Object.entries(responseMetrics).forEach(([type, paths]) => {
      metrics[type] = metrics[type] || {};
      Object.entries(paths).forEach(([path, mtrcs]) => {
        metrics[type][path] = mtrcs;
      });
    });
    await api.postPromise('metrics', {
      id: id,
      repo: repo,
      data: metrics
    });
    data.has_performance_metrics = true;
    await api.postPromise('repo', {
      id: id,
      data: data
    });
    progress.setProgress(1, 1);
    buildPage();
    progress.end();
  });

  $('[data-a="coverage-extract"]').on('click', async () => {
    progress.init('Extract metrics from report', 2);
    const coverage = await api.postPromise('calccoverage', {
      id: id,
      repo: repo
    });
    Object.entries(coverage.data).forEach(([path, coverageMetrics]) => {
      const pathFixed = path.replace(/\\/g, '/').replace(/.*(?=\/projects)/, '.');
      let testConnection = null;
      Object.entries(metrics.testConnections).forEach(([testPath, sourcePath]) => {
        if (testPath === 'OTHER') {
          if (sourcePath.includes(pathFixed)) {
            const moduleName = pathFixed.match(/(?<=\/)[^\/]+(?=\.[jt]sx?)/)[0];
            const otherPath = pathFixed.replace(new RegExp(`${moduleName}(?=\.[jt]sx?)`), `OTHER-${moduleName}`);
            if (testConnection === null) {
              testConnection = [ metrics.test[otherPath] ];
            }
            else {
              testConnection.push(metrics.test[otherPath]);
            }
          }
        }
        else {
          if (sourcePath === pathFixed) {
            if (testConnection === null) {
              testConnection = [ metrics.test[testPath] ];
            }
            else {
              testConnection.push(metrics.test[testPath]);
            }
          }
        }
      });
      if (!testConnection) {
        const moduleName = pathFixed.match(/(?<=\/)[^\/]+(?=\.[jt]sx?)/)[0];
        const otherPath = pathFixed.replace(new RegExp(`${moduleName}(?=\.[jt]sx?)`), `OTHER-${moduleName}`)
        metrics.test[otherPath] = metrics.test[otherPath] || {};
        testConnection = [ metrics.test[otherPath] ];
        metrics.testConnections.OTHER = metrics.testConnections.OTHER || [];
        metrics.testConnections.OTHER.push(pathFixed);
      }
      testConnection.forEach((connection) => {
        connection.lcovM = coverageMetrics.lines.pct;
        connection.fcovM = coverageMetrics.functions.pct;
        connection.scovM = coverageMetrics.statements.pct;
        connection.bcovM = coverageMetrics.branches.pct;
      });
    });
    progress.setProgress(1, 2);
    await api.postPromise('metrics', {
      id: id,
      repo: repo,
      data: metrics
    });
    progress.setProgress(2, 2);
    buildPage();
    progress.end();
  });

  $('[data-a="coverage-extract-perf"]').on('click', async () => {
    progress.init('Extract metrics from report (performance tests)', 2);
    const coverage = await api.postPromise('calccoverage', {
      id: id,
      repo: repo
    });

    metrics.performance = metrics.performance || {};
    Object.entries(coverage.data).forEach(([path, coverageMetrics]) => {
      const pathFixed = path.replace(/\\/g, '/').replace(/.*(?=\/projects)/, '.');
      let testConnection = null;
      Object.entries(metrics.performanceConnections).forEach(([testPath, sourcePath]) => {
        if (testPath === 'OTHER') {
          if (sourcePath.includes(pathFixed)) {
            const moduleName = pathFixed.match(/(?<=\/)[^\/]+(?=\.[jt]sx?)/)[0];
            const otherPath = pathFixed.replace(new RegExp(`${moduleName}(?=\.[jt]sx?)`), `OTHER-${moduleName}`);
            if (testConnection === null) {
              testConnection = [ metrics.performance[otherPath] ];
            }
            else {
              testConnection.push(metrics.performance[otherPath]);
            }
          }
        }
        else {
          if (sourcePath === pathFixed) {
            if (testConnection === null) {
              testConnection = [ metrics.performance[testPath] ];
            }
            else {
              testConnection.push(metrics.performance[testPath]);
            }
          }
        }
      });
      if (!testConnection) {
        const moduleName = pathFixed.match(/(?<=\/)[^\/]+(?=\.[jt]sx?)/)[0];
        const otherPath = pathFixed.replace(new RegExp(`${moduleName}(?=\.[jt]sx?)`), `OTHER-${moduleName}`)
        metrics.performance[otherPath] = metrics.performance[otherPath] || {};
        testConnection = [ metrics.performance[otherPath] ];
        metrics.performanceConnections.OTHER = metrics.performanceConnections.OTHER || [];
        metrics.performanceConnections.OTHER.push(pathFixed);
      }
      testConnection.forEach((connection) => {
        connection.lcovM = coverageMetrics.lines.pct;
        connection.fcovM = coverageMetrics.functions.pct;
        connection.scovM = coverageMetrics.statements.pct;
        connection.bcovM = coverageMetrics.branches.pct;
      });
    });
    progress.setProgress(1, 2);
    await api.postPromise('metrics', {
      id: id,
      repo: repo,
      data: metrics
    });
    progress.setProgress(2, 2);
    buildPage();
    progress.end();
  });

  $('[data-a="save-connections"]').on('click', async () => {
    progress.init('Save connection data', 1);
    forms.toJson($('[data-e="connections-test"]'), metrics.testConnections);
    forms.toJson($('[data-e="connections-performance"]'), metrics.performanceConnections);
    const metricsResponse = await api.postPromise('metrics', {
      id: id,
      repo: repo,
      data: metrics
    });
    metrics = metricsResponse.data;
    progress.setProgress(1, 1);
    buildPage();
    progress.end();
  });

  $('[data-a="save-manual"]').on('click', async () => {
    progress.init('Save manual data', 2);
    data = forms.toJson($('[data-e="manual-classification"]'), data);
    await api.postPromise('repo', {
      id: id,
      data: data
    });
    progress.setProgress(1, 2);
    document.querySelectorAll('[data-e="manual-test"] input').forEach((input) => {
      if (input.value !== '') {
        metrics.test[input.name].notcM = Number(input.value);
      }
      else if (metrics.test[input.name].notcM) {
        delete metrics.test[input.name].notcM;
      }
    });
    metrics.test = forms.toJson($('[data-e="manual-test"] input'), metrics.test);
    const metricsResponse = await api.postPromise('metrics', {
      id: id,
      repo: repo,
      data: metrics
    });
    metrics = metricsResponse.data;
    progress.setProgress(2, 2);
    buildPage();
    progress.end();
  });

  $('[data-a="save-perf"]').on('click', async () => {
    progress.init('Save manual data', 1);
    data.performance_test_occurences = forms.toJson($('[data-e="performance"]'), data.performance_test_occurences);
    await api.postPromise('repo', {
      id: id,
      data: data
    });
    progress.setProgress(1, 1);
    buildPage();
    progress.end();
  });

  // Copy code to clipboard
  $('code').on('click', (e) => {
    navigator.clipboard.writeText($(e.target).text());
  });

  $('[data-a="done"]').on('click', async () => {
    progress.init('Toggle todo state', 1);
    if (data.is_done === true) {
      delete data.is_done;
      $('[data-a="done"]').removeClass('btn-success').addClass('btn-danger').text('TODO');
    }
    else {
      data.is_done = true;
      $('[data-a="done"]').removeClass('btn-danger').addClass('btn-success').html('<i class="fa-solid fa-check"></i>');
    }
    await api.postPromise('repo', {
      id: id,
      data: data
    });
    progress.setProgress(1, 1);
    progress.end();
  });
})();