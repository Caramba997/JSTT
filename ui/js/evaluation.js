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
    progress.init('Calc correlations (Progress in server log)', 1);
    const response = await api.postPromise('calccorrelations', {
      id: id
    });
    data.correlations = response.data;
    await api.postPromise('evaluation', {
      id: id,
      data: data
    });
    buildPage();
    progress.end();
  });

})();