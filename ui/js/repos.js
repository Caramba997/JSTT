(function () {
  const search = new URLSearchParams(location.search),
        id = search.get('id');
  if (!id) {
    $('[data-e="error"]').text('Error retrieving results. Check if query param is valid, e.g. ?id=version_1').show();
    return;
  }

  // Init tooltips
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });
  
  let data, depData;

  function buildPage() {
    const tbody = $('[data-e="repo-list"] tbody'),
          template = $($('[data-t="repo-list-item"]').html()),
          stats = data.stats || {};
    tbody.html('');
    for (let i = 0; i < data.repos.length; i++) {
      const repo = data.repos[i],
            html = template.clone(true);
      html.data('index', i);
      html.data('id', repo.full_name);
      html.find('[data-e="repo-index"]').text(i + 1);
      html.find('[data-e="repo-name"]').text(repo.full_name).attr('href', `/ui/repo?name=${repo.full_name}`);
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
      let depCount = 0,
          deps = [];
      if (repo.package_json !== undefined && !repo.multiple_package_json) {
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
        html.find('[data-e="repo-deps"]').text(depCount).attr('title', deps.join('\n'));
      }
      html.find('a[data-e="repo-git"]').attr('href', repo.html_url);
      tbody.append(html);
    }
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
  }

  api.get('repos', {
    id: id
  }, async (response) => {
    data = response.data;
    $('#navbarSupportedContent [data-a]').prop('disabled', false);
    $('[data-e="project-link"]').attr('href', `/ui/project?id=${id}`);
    const hasDependencies = await api.getPromise('exists', {
      id: id,
      file: 'dependencies.json'
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
            js: 0,
            ts: 0,
            org: 0,
            individual: 0,
            maxstars: 0,
            minstars: 100000000
          };
    for (let i = 0; i < data.repos.length; i++) {
      progress.setProgress(i, data.repos.length);
      const repo = data.repos[i];
      if (repo.language === 'JavaScript') stats.js++;
      if (repo.language === 'TypeScript') stats.ts++;
      if (repo.owner.type === 'Organization') stats.org++;
      if (repo.owner.type === 'User') stats.individual++;
      stats.maxstars = Math.max(stats.maxstars, repo.stargazers_count);
      stats.minstars = Math.min(stats.minstars, repo.stargazers_count);
    }
    if (progress.status === 0) return;
    data.stats = stats;
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
    for (let i = 0; i < data.repos.length && status === 1; i++) {
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
        totalCommits += repo.total_commits;
        progress.setStartIndex(i + 1);
        continue;
      }
      const response = await api.postPromise('countcommits', {
        data: repo
      });
      if (response) {
        result = response.data;
        data.repos[i] = result;
        totalCommits += result.total_commits;
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
        totalPRs += repo.total_prs;
        progress.setStartIndex(i + 1);
        continue;
      }
      const response = await api.postPromise('countprs', {
        data: repo
      });
      if (response) {
        result = response.data;
        data.repos[i] = result;
        totalPRs += result.total_prs;
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
      setProgress(i, data.repos.length);
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