(function () {
  const search = new URLSearchParams(location.search),
        id = search.get('id');
  if (!id) {
    $('[data-e="error"]').text('Error retrieving results. Check if query param is valid, e.g. ?id=version_1').show();
    return;
  }
  
  let data, depData;

  function buildPage() {
    const tbody = $('[data-e="repo-list"] tbody'),
          template = $($('[data-t="repo-list-item"]').html()),
          stats = data.stats || {};
    tbody.html('');
    let doneRepos = 0;
    let haveTests = 0,
        haveUiTests = 0,
        havePerfTests = 0;
    let nextRepo = null;
    for (let i = 0; i < data.repos.length; i++) {
      const repo = data.repos[i],
            html = template.clone(true);
      html.data('index', i);
      html.data('id', repo.full_name);
      html.find('[data-e="repo-index"]').text(i + 1);
      const repoNameElement = html.find('[data-e="repo-name"]')
      repoNameElement.text(repo.full_name).attr('href', `/ui/repo?id=${id}&repo=${repo.full_name}`);
      html.find('[data-e="repo-language"]').text(repo.language);
      html.find('[data-e="repo-stars"]').text(repo.stargazers_count);
      if (repo.total_commits !== undefined) html.find('[data-e="repo-commits"]').text(repo.total_commits);
      if (repo.total_prs !== undefined) html.find('[data-e="repo-prs"]').text(repo.total_prs);
      if (repo.is_npm) {
        if (repo.multiple_package_json) {
          html.find('[data-e="repo-npm-pending"]').show();
        }
        else {
          html.find('[data-e="repo-npm-approved"]').show();
        }
      }
      let hasDeps = false,
          depCount = 0,
          deps = [];
      if (repo.package_json !== undefined && !repo.multiple_package_json) {
        hasDeps = true;
        if (repo.package_json.dependencies) {
          Object.keys(repo.package_json.dependencies).forEach((dep) => {
            depCount++;
            deps.push(dep);
          });
        }
        if (repo.package_json.devDependencies) {
          Object.keys(repo.package_json.devDependencies).forEach((dep) => {
            depCount++;
            deps.push(dep);
          });
        }
      }
      if (repo.dependencies !== undefined) {
        hasDeps = true;
        depCount += repo.dependencies.length;
        deps.push(...repo.dependencies);
      }
      if (hasDeps) {
        html.find('[data-e="repo-deps"]').text(depCount).attr('title', deps.join('<br>'));
      }
      if (repo.local_folder !== undefined) html.find('[data-e="repo-downloaded"]').show();
      if (repo.is_done) {
        doneRepos++;
        html.css('background-color', 'lightgreen');
        const repoStatsHtml = `Tests: ${repo.has_tests ? '<i class="fa-solid fa-check" style=""></i>' : '<i class="fa-solid fa-xmark" style=""></i>'}<br>
        UI Tests: ${repo.has_ui_tests ? '<i class="fa-solid fa-check" style=""></i>' : '<i class="fa-solid fa-xmark" style=""></i>'}<br>
        Perf Tests: ${repo.has_performance_tests ? '<i class="fa-solid fa-check" style=""></i>' : '<i class="fa-solid fa-xmark" style=""></i>'}`;
        repoNameElement.attr('title', repoStatsHtml);
      }
      else if (nextRepo === null) {
        nextRepo = html;
      }
      if (repo.has_tests === true) {
        haveTests++;
        if (repo.has_ui_tests) haveUiTests++;
        if (repo.has_performance_tests) havePerfTests++;
      }
      html.find('a[data-e="repo-git"]').attr('href', repo.html_url);
      tbody.append(html);
    }
    if (nextRepo) nextRepo[0].scrollIntoView({ behavior: 'instant', block: 'center' });
    if (depData) {
      const dbody = $('[data-e="deps"] tbody'),
            dtemplate = $($('[data-t="deps-item"]').html());
      dbody.html('');
      const deps = Array.from(Object.entries(depData));
      for (let i = 0; i < deps.length; i++) {
        const [name, props] = deps[i],
              html = dtemplate.clone(true);
        html.data('index', i);
        html.data('id', name);
        html.find('[data-e="deps-index"]').text(i + 1);
        html.find('[data-e="deps-name"]').text(name);
        html.find('[data-e="deps-prod"]').text(props.prod);
        html.find('[data-e="deps-dev"]').text(props.dev);
        html.find('[data-e="deps-total"]').text(props.total);
        dbody.append(html);
      }
    }
    Array.from(Object.entries(stats)).forEach(([key, value]) => {
      $(`[data-e="stats-${key}"]`).text(value);
    });
    $(`[data-e="stats-nojs"]`).text(`${Math.round((data.stats.total - data.stats.withJs) / data.stats.total * 100)}% (${data.stats.total - data.stats.withJs}/${data.stats.total})`);
    $(`[data-e="stats-done"]`).text(`${Math.round(doneRepos / data.stats.total * 100)}% (${doneRepos}/${data.stats.total})`);
    $(`[data-e="stats-tests"]`).text(`${Math.round(haveTests / data.stats.withJs * 100)}% (${haveTests}/${data.stats.withJs})`);
    $(`[data-e="stats-ui-tests"]`).text(`${Math.round(haveUiTests / data.stats.frontend * 100)}% (${haveUiTests}/${data.stats.frontend})`);
    $(`[data-e="stats-perf-tests"]`).text(`${Math.round(havePerfTests / data.stats.withJs * 100)}% (${havePerfTests}/${data.stats.withJs})`);
    $(`[data-e="stats-frontend"]`).text(data.stats.frontend);
    $(`[data-e="stats-backend"]`).text(data.stats.backend);

    // Init tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
      return new bootstrap.Tooltip(tooltipTriggerEl);
    });
  }

  api.get('repos', {
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

  $('[data-a="calc-stats"]').on('click', async () => {
    progress.init('Calc stats', data.repos.length);
    const stats = {
            name: id,
            total: data.repos.length,
            withJs: 0,
            js: 0,
            ts: 0,
            org: 0,
            individual: 0,
            maxstars: 0,
            minstars: 100000000,
            frontend: 0,
            backend: 0,
            npm: 0
          };
    for (let i = 0; i < data.repos.length; i++) {
      progress.setProgress(i, data.repos.length);
      const repo = data.repos[i];
      if (repo.no_javascript) continue;
      stats.withJs++;
      if (repo.language === 'JavaScript') stats.js++;
      if (repo.language === 'TypeScript') stats.ts++;
      if (repo.owner.type === 'Organization') stats.org++;
      if (repo.owner.type === 'User') stats.individual++;
      if (repo.is_npm === true) stats.npm++;
      stats.maxstars = Math.max(stats.maxstars, repo.stargazers_count);
      stats.minstars = Math.min(stats.minstars, repo.stargazers_count);
      if (repo.has_frontend) stats.frontend++;
      if (repo.has_backend) stats.backend++;
    }
    if (progress.status === 0) return;
    if (data.stats === undefined) {
      data.stats = stats;
    }
    else {
      Object.entries(stats).forEach(([key, value]) => {
        if (key === 'npm' && value === 0) return;
        data.stats[key] = value;
      });
    }
    await api.postPromise('repos', {
      id: id,
      data: data
    });
    buildPage();
    progress.end();
  });

  $('[data-a="check-npm"]').on('click', async () => {
    progress.init('Check NPM', data.repos.length, buildPage);
    let totalNpm = 0;
    for (let i = 0; i < data.repos.length && progress.status === 1; i++) {
      progress.setProgress(i, data.repos.length);
      const repo = data.repos[i];
      if (repo.is_npm !== undefined) {
        if (repo.is_npm) totalNpm++;
        progress.setStartIndex(i + 1);
        continue;
      }
      const response = await api.postPromise('checknpm', {
        data: repo
      });
      if (response) {
        result = response.data;
        data.repos[i] = result;
        if (result.is_npm) totalNpm++;
        await api.postPromise('repos', {
          id: id,
          data: data
        });
      }
      else {
        const alert = $('[data-e="error"]');
        alert.html('Check NPM failed').show();
        setTimeout(() => {
          alert.hide();
        }, 5000);
        progress.end();
        break;
      }
    }
    if (progress.status === 0) return;
    data.stats.npm = totalNpm;
    await api.postPromise('repos', {
      id: id,
      data: data
    });
    buildPage();
    progress.end();
  });

  $('[data-a="count-commits"]').on('click', async () => {
    progress.init('Count commits', data.repos.length, buildPage);
    let totalCommits = 0;
    for (let i = 0; i < data.repos.length && progress.status === 1; i++) {
      progress.setProgress(i, data.repos.length);
      const repo = data.repos[i];
      if (repo.total_commits !== undefined) {
        if (!repo.no_javascript) totalCommits += repo.total_commits;
        progress.setStartIndex(i + 1);
        continue;
      }
      const response = await api.postPromise('countcommits', {
        data: repo
      });
      if (response) {
        result = response.data;
        data.repos[i] = result;
        if (!repo.no_javascript) totalCommits += result.total_commits;
        await api.postPromise('repos', {
          id: id,
          data: data
        });
      }
      else {
        const alert = $('[data-e="error"]');
        alert.html('Counting commits failed').show();
        setTimeout(() => {
          alert.hide();
        }, 5000);
        progress.end();
        break;
      }
    }
    if (progress.status === 0) return;
    data.stats.commits = totalCommits;
    await api.postPromise('repos', {
      id: id,
      data: data
    });
    buildPage();
    progress.end();
  });

  $('[data-a="count-prs"]').on('click', async () => {
    progress.init('Count PRs', data.repos.length, buildPage);
    let totalPRs = 0;
    for (let i = 0; i < data.repos.length && progress.status === 1; i++) {
      progress.setProgress(i, data.repos.length);
      const repo = data.repos[i];
      if (repo.total_prs !== undefined) {
        if (!repo.no_javascript) totalPRs += repo.total_prs;
        progress.setStartIndex(i + 1);
        continue;
      }
      const response = await api.postPromise('countprs', {
        data: repo
      });
      if (response) {
        result = response.data;
        data.repos[i] = result;
        if (!repo.no_javascript) totalPRs += result.total_prs;
        await api.postPromise('repos', {
          id: id,
          data: data
        });
      }
      else {
        const alert = $('[data-e="error"]');
        alert.html('Counting commits failed').show();
        setTimeout(() => {
          alert.hide();
        }, 5000);
        progress.end();
        break;
      }
    }
    if (progress.status === 0) return;
    data.stats.prs = totalPRs;
    await api.postPromise('repos', {
      id: id,
      data: data
    });
    buildPage();
    progress.end();
  });

  $('[data-a="calc-deps"]').on('click', async () => {
    progress.init('Calc dependencies', data.repos.length);
    let dependencies = {};
    for (let i = 0; i < data.repos.length && progress.status === 1; i++) {
      progress.setProgress(i, data.repos.length);
      const repo = data.repos[i];
      if (repo.package_json === undefined || repo.multiple_package_json) continue;
      const deps = repo.package_json.dependencies,
            devDeps = repo.package_json.devDependencies;
      if (deps) {
        Object.keys(deps).forEach((dep) => {
          if (!dependencies[dep]) {
            dependencies[dep] = {
              prod: 1,
              dev: 0,
              total: 1
            };
          }
          else {
            dependencies[dep].prod++;
            dependencies[dep].total++;
          }
        });
      }
      if (devDeps) {
        Object.keys(devDeps).forEach((dep) => {
          if (!dependencies[dep]) {
            dependencies[dep] = {
              prod: 0,
              dev: 1,
              total: 1
            };
          }
          else {
            dependencies[dep].dev++;
            dependencies[dep].total++;
          }
        });
      }
    }
    if (progress.status === 0) return;
    const tempDeps = Array.from(Object.entries(dependencies)).sort((a, b) => {
      const totalDiff = b[1].total - a[1].total;
      if (totalDiff !== 0) return totalDiff;
      return a[0].localeCompare(b[0]);
    });
    dependencies = {};
    tempDeps.forEach((dep) => {
      if (dep[1].total > 1) dependencies[dep[0]] = dep[1];
    });
    await api.postPromise('dependencies', {
      id: id,
      data: dependencies
    });
    depData = dependencies;
    buildPage();
    progress.end();
  });
})();