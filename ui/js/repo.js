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

  // Init tooltips
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });

  let data;

  function buildPage() {
    $('[data-e="github-link"]').attr('href', data.html_url);
    $('[data-e="info-name"]').text(data.name);
    $('[data-e="info-owner"]').text(data.owner.login);
    $('[data-e="info-language"]').text(data.language);
    $('[data-e="info-stars"]').text(data.stargazers_count);
    if (data.total_commits) $('[data-e="info-commits"]').text(data.total_commits);
    if (data.total_prs) $('[data-e="info-prs"]').text(data.total_prs);
    if (data.is_npm) {
      if (data.multiple_package_json) {
        $('[data-e="info-npm"]').text('TODO: Select from multiple package.json');
      }
      else {
        $('[data-e="info-npm"]').html('<i class="fa-solid fa-check"></i>');
      }
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
      $('[data-e="info-deps"]').text(depCount).attr('title', deps.join('\n'));
    }
    if (data.hast_tests === true) {
      $('[data-e="info-tests"]').html('<i class="fa-solid fa-check"></i>').attr('title', `${data.test_occurences.dirs.join('\n')}\n\n${data.test_occurences.files.join('\n')}`);
    }
    else if (data.has_tests === false) {
      $('[data-e="info-tests"]').html('<i class="fa-solid fa-xmark"></i>')
    }
  }

  api.get('repo', {
    id: id,
    repo: encodeURIComponent(repo)
  }, async (response) => {
    data = response.data;
    $('#navbarSupportedContent [data-a]').prop('disabled', false);
    buildPage();
  }, (error) => {
    console.warn(error);
    $('[data-e="error-load"]').show();
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
    console.log(data);
    await api.postPromise('repo', {
      id: id,
      data: data
    });
    progress.setProgress(1, 1);
    progress.end();
  });

  $('[data-a="check-tests"]').on('click', async () => {
    progress.init('Check tests', 1);
    const response = await api.postPromise('checktests', {
      id: id,
      repo: repo
    });
    console.log(response.data);
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
})();