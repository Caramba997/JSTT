(function () {
  const search = new URLSearchParams(location.search),
        id = search.get('id');
  if (!id) {
    $('[data-e="error-load"]').html('Id search parameter missing (E.g. ?id=version_1)').show();
    return;
  }

  async function getCommitsAndPrs() {
    const repos = (await api.getPromise('repos', { id: id })).data,
          metrics = (await api.getPromise('metrics', { id: id })).data,
          allCommits = (await api.getPromise('commits', { id: id })).data;
    progress.init('Get Commits and PRs', repos.repos.length);
    const completed = Object.keys(allCommits.commits).length;
    if (completed > 0) progress.setStartIndex(completed);

    for (let i = completed; i < repos.repos.length && progress.status === 1; i++) {
      progress.setProgress(i, repos.repos.length);
      const repo = repos.repos[i];
      const name = repo.full_name;
      if (!repo.has_tests) continue;
      const repoMetrics = metrics.repos[name];
      if (!repoMetrics.testConnections || repoMetrics.testConnections === {}) continue;
      const commits = (await api.getPromise('commits', { id: id, repo: name })).data,
            prs = (await api.getPromise('prs', { id: id, repo: name })).data;
      const repoName = name.split('/')[1],
            repoOwner = name.split('/')[0];
      const connectionsArray = Array.from(Object.entries(repoMetrics.testConnections));
      for (let t = 0; t < connectionsArray.length && progress.status === 1; t++) {
        const [ testFile, sourceFile ] = connectionsArray[t];
        if (testFile === 'OTHER' || !sourceFile) continue;
        const testCommits = await api.postPromise('findCommits', {
          repo: repoName,
          owner: repoOwner,
          file: testFile.split(name.replace(/[^\w]/g, '_'))[1]
        });
        const sourceCommits = await api.postPromise('findCommits', {
          repo: repoName,
          owner: repoOwner,
          file: sourceFile.split(name.replace(/[^\w]/g, '_'))[1]
        });
        let matches = [];
        for (let ct = 0; ct < testCommits.data.length; ct++) {
          const testCommit = testCommits.data[ct];
          let found = false;
          for (let cs = 0; cs < sourceCommits.data.length && !found; cs++) {
            const sourceCommit = sourceCommits.data[cs];
            if (testCommit.sha === sourceCommit.sha) {
              const commitPrs = await api.postPromise('findPrs', {
                repo: repoName,
                owner: repoOwner,
                commit: testCommit.sha
              });
              for (let p = 0; p < commitPrs.data.length; p++) {
                const commitPr = commitPrs.data[p];
                prs.push(commitPr);
                testCommit.prs = testCommit.prs || [];
                testCommit.prs.push(commitPr.number);
              }
              matches.push(testCommit);
              found = true;
            }
          }
        }
        commits.push(...matches);
      }
      await api.postPromise('commits', { id: id, repo: name, data: commits });
      await api.postPromise('prs', { id: id, repo: name, data: prs });
    }
    progress.end();
  }

  async function calcStats() {
    const commits = (await api.getPromise('commits', { id: id })).data,
          prs = (await api.getPromise('prs', { id: id })).data;
    commits.stats = {
      list: []
    };
    Object.entries(commits.commits).forEach(([project, coms]) => {
      commits.stats.list.push(coms.length);
    });
    commits.stats.total = commits.stats.list.reduce((prev, curr) => prev + curr, 0);
    commits.stats.avg = commits.stats.list.reduce((prev, curr) => prev + curr, 0) / commits.stats.list.length;
    let sorted = [...commits.stats.list].sort((a, b) => a - b);
    commits.stats.med = sorted.length % 2 === 1 ? sorted[Math.floor(sorted.length / 2)] : (sorted[sorted.length / 2- 1] + sorted[sorted.length / 2]) / 2;
    commits.stats.min = Math.min(...commits.stats.list);
    commits.stats.max = Math.max(...commits.stats.list);
    prs.stats = {
      list: []
    };
    Object.entries(prs.prs).forEach(([project, pulls]) => {
      prs.stats.list.push(pulls.length);
    });
    prs.stats.total = prs.stats.list.reduce((prev, curr) => prev + curr, 0);
    prs.stats.avg = prs.stats.list.reduce((prev, curr) => prev + curr, 0) / prs.stats.list.length;
    sorted = [...prs.stats.list].sort((a, b) => a - b);
    prs.stats.med = sorted.length % 2 === 1 ? sorted[Math.floor(sorted.length / 2)] : (sorted[sorted.length / 2- 1] + sorted[sorted.length / 2]) / 2;
    prs.stats.min = Math.min(...prs.stats.list);
    prs.stats.max = Math.max(...prs.stats.list);
    await api.postPromise('commits', { id: id, data: commits });
    await api.postPromise('prs', { id: id, data: prs });
  }

  $('[data-a="download"]').on('click', () => {
    getCommitsAndPrs();
  });

  $('[data-a="stats"]').on('click', () => {
    calcStats();
  });


})();