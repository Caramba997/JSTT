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
      $('[data-e="info-tests"]').html('<i class="fa-solid fa-check"></i>').attr('title', `${data.test_occurences.dirs.join('\n')}\n\n${data.test_occurences.files.join('\n')}`);
    }
    else if (data.has_tests === false) {
      $('[data-e="info-tests"]').html('<i class="fa-solid fa-xmark"></i>')
    }
    if (data.is_done === true) {
      $('[data-a="done"]').removeClass('btn-danger').addClass('btn-success').html('<i class="fa-solid fa-check"></i>');
    }
    if (metrics) {
      $('#manual button').prop('disabled', false);
      if (!definitions) {
        const defResponse = await api.getPromise('metricdefs');
        definitions = defResponse.data;
      }
      Object.entries(metrics).forEach(([category, names]) => {
        if (category === 'test' && !data.has_tests) return;
        const element = $(`[data-e="metrics-${category}"] tbody`);
        element.html('');
        Object.entries(names).forEach(([name, values]) => {
          const metric = name.match(/[a-z]+/)[0],
                scope = name.match(/[A-Z]/)[0] === 'M' ? 'Module' : 'Function';
          const def = definitions[metric] || { name: '?', description: '?'},
                tooltip = `<b>${def.name}</b><br><em>Scope: ${scope}</em><br>${def.description}`;
          let cells = `<tr data-name="${name}"><td scope="row" data-bs-toggle="tooltip" data-bs-placement="right" data-bs-html="true" title="${tooltip}">${name}</td>`;
          Object.entries(values).forEach(([type, value]) => {
            const valueS = value !== null ? `${value}`.split('.') : '?',
                  valueF = valueS.length === 2 ? `${value.toFixed(3)}`.replace(/(\.0+|(?<=\.[1-9])0+|(?<=\.[0-9][1-9])0+)$/, '') : `${value}`;
            cells += `<td data-type="${type}">${valueF}</td>`;
          });
          cells += '</tr>';
          element.append(cells);
        });
      });
      forms.fromJson($('[data-e="manual-test"]'), metrics.test);
      let frameworks = await api.getPromise('frameworks');
      if (frameworks) frameworks = frameworks.data.frameworks.sort();
      if (frameworks.length > 0) {
        const selectElem = $('[data-e="frameworks"]'),
              template = $($('[data-t="frameworks-item"]').html());
        selectElem.html('');
        frameworks.forEach((category) => {
          const html = template.clone(true);
          html.val(category);
          html.text(category);
          selectElem.append(html);
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
        selectElem.html('');
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
        selectElem.html('');
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
    if (data.has_metrics) {
      api.get('metrics', {
        id: id,
        repo: encodeURIComponent(repo)
      }, async (response) => {
        metrics = response.data;
        buildPage();
      }, (error) => {
        console.warn(error);
        buildPage();
        $('[data-e="error-load"]').show();
      });
    }
    else {
      buildPage();
    }
  }, (error) => {
    console.warn(error);
    $('[data-e="error-load"]').show();
  });

  const categorySelector = $('[data-e="categories"]');
  categorySelector.on('change', () => {
    const value = categorySelector.val();
    const input = $('input[name="categories"]');
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
    progress.setProgress(1, 1);
    progress.end();
  });

  $('[data-a="clean"]').on('click', async () => {
    progress.init('Clean repo', 1);
    const response = await api.postPromise('clean', {
      id: id,
      repo: repo
    });
    if (!response) {
      const alert = $('[data-e="error"]');
      alert.html('Error cleaning repo').show();
      setTimeout(() => {
        alert.hide();
      }, 5000);
    }
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
    Object.entries(responseMetrics).forEach(([name, mtrcs]) => {
      Object.entries(mtrcs).forEach(([metric, values]) => {
        metrics[name][metric] = values;
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

  $('[data-a="coverage-extract"]').on('click', async () => {
    progress.init('Extract metrics from report', 2);
    const coverage = await api.postPromise('calccoverage', {
      id: id,
      repo: repo
    });
    Object.entries(coverage.data).forEach(([key, value]) => {
      metrics.test[key] = value;
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

  $('[data-a="save-manual"]').on('click', async () => {
    progress.init('Save manual data', 2);
    data = forms.toJson($('[data-e="manual-classification"]'), data);
    await api.postPromise('repo', {
      id: id,
      data: data
    });
    progress.setProgress(1, 2);
    metrics.test = forms.toJson($('[data-e="manual-test"]'), metrics.test);
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