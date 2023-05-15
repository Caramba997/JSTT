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
  
  }

  api.get('evaluation', {
    id: id
  }, async (response) => {
    data = response.data;
    $('#navbarSupportedContent [data-a]').prop('disabled', false);
    $('[data-e="project-link"]').attr('href', `/ui/project?id=${id}`);
    const hasDependencies = await api.getPromise('exists', {
      type: 'project',
      file: 'dependencies.json',
      vars: id
    });
    if (hasDependencies.data.exists) {
      api.get('dependencies', {
        id: id
      }, (response) => {
        depData = response.data;
        buildPage();
      }, (error) => {
        console.warn(error);
        buildPage();
      });
    }
    else {
      buildPage();
    }
  }, (error) => {
    console.warn(error);
    $('[data-e="error-load"]').show();
  });

  $('[data-a="calc-correlations"]').on('click', async () => {
    progress.init('Calc correlations', 1);
    const metrics = await api.getPromise('metrics', {
      id: id
    });
    const repoCount = Object.keys(metrics.repos).length;
    progress.setProgress(0, repoCount);
    const correlations = {};
    let current = 1;
    Object.entries(metrics.repos).forEach(async ([repo, repoMetrics]) => {
      const response = await api.postPromise('calccorrelations', {
        id: id
      });
      correlations[repo] = response.data;
      progress.setProgress(current++, repoCount);
    });
    data.correlations = correlations;
    await api.postPromise('evaluation', {
      id: id,
      data: data
    });
    buildPage();
    progress.end();
  });

})();