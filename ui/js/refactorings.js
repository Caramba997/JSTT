(async function () {
  const search = new URLSearchParams(location.search),
        id = search.get('id');
  if (!id) {
    $('[data-e="error-load"]').html('Id search parameter missing (E.g. ?id=version_1)').show();
    return;
  }

  let COMMITS = (await api.getPromise('commits', { id: id })).data,
      PRS = (await api.getPromise('prs', { id: id })).data,
      REFACTORINGS = (await api.getPromise('refactorings', { id: id })).data;
  buildPage();

  function buildPage() {
    const statsElement = $('[data-e="info"]');
    if (COMMITS.stats) {
      Object.entries(COMMITS.stats).forEach(([key, value]) => {
        statsElement.find(`[data-e="info-c${key}"]`).text(`${value}`);
      });
    }
    if (PRS.stats) {
      Object.entries(PRS.stats).forEach(([key, value]) => {
        statsElement.find(`[data-e="info-p${key}"]`).text(`${value}`);
      });
    }
    const tbody = $('[data-e="commit-list"] tbody'),
          template = $($('[data-t="commit-list-item"]').html());
    tbody.html('');
    let filteredCommits = 0,
        doneCommits = 0,
        commitsWithTrs = 0,
        trs = 0,
        refactoringCount = 0,
        nextCommit = null,
        c = 0;
    const filter = $('[data-e="commit-filter').val();
    Object.entries(COMMITS.commits).forEach(([repo, commits]) => {
      for (let i = 0; i < commits.length; i++) {
        const commit = commits[i],
              html = template.clone(true);
        if (filter === 'undone' && commit.is_done) continue;
        if (filter === 'no_refactorings_selection' && !commit.in_selection) continue;
        if (filter === 'test_refactor' && !(commit.commit.message && commit.commit.message.includes('test') && commit.commit.message.includes('refactor'))) continue;
        const refactorings = REFACTORINGS.refactorings[repo];
        let backgroundSet = false;
        if (refactorings && refactorings[commit.sha] && refactorings[commit.sha].length > 0) {
          const commitTrs = refactorings[commit.sha].filter(ref => ref.is_testability_refactoring);
          if (commitTrs.length > 0) {
            commitsWithTrs++;
            trs += commitTrs.length;
            backgroundSet = true;
            html.css('background-color', 'red');
          }
        }
        if (filter === 'testability_refactorings' && !backgroundSet) continue;
        if (filter === 'refactorings' && refactorings && refactorings[commit.sha] && refactorings[commit.sha].length === 0) continue;
        filteredCommits++;
        html.data('index', c);
        html.data('id', commit.sha);
        html.find('[data-e="commit-index"]').text(c + 1);
        const commitNameElement = html.find('[data-e="commit-sha"]')
        commitNameElement.text(commit.sha).attr('href', `/ui/commit?id=${id}&sha=${commit.sha}&repo=${repo}`);
        html.find('[data-e="commit-repo"]').text(repo);
        html.find('[data-e="commit-prs"]').text(commit.prs ? commit.prs.length : 0);
        html.find('[data-e="commit-refactorings"]').text(refactorings && refactorings[commit.sha] ? refactorings[commit.sha].length : 0);
        if (commit.is_marked) {
          backgroundSet ? html.css('background-color', 'orange') : html.css('background-color', 'yellow');
          backgroundSet = true;
        }
        if (commit.is_done) {
          doneCommits++;
          if (!backgroundSet) html.css('background-color', 'lightgreen');
          html.find('[data-e="commit-done"]').show();
        }
        else if (nextCommit === null) {
          nextCommit = html;
        }
        html.find('[data-e="commit-git"]').attr('href', commit.html_url);
        tbody.append(html);
        c++;
        if (REFACTORINGS.refactorings[repo] && REFACTORINGS.refactorings[repo][commit.sha]) refactoringCount += REFACTORINGS.refactorings[repo][commit.sha].length;
      }
    });
    if (COMMITS.stats) statsElement.find(`[data-e="info-progress"]`).text(`${Math.floor(doneCommits / filteredCommits * 100)}% (${doneCommits}/${filteredCommits})`);
    if (refactoringCount) statsElement.find(`[data-e="info-refactorings"]`).text(refactoringCount);
    if (nextCommit) nextCommit[0].scrollIntoView({ behavior: 'instant', block: 'center' });
    statsElement.find(`[data-e="info-trs"]`).text(trs);
    statsElement.find(`[data-e="info-ctrs"]`).text(commitsWithTrs);
  }

  async function getCommitsAndPrs() {
    const repos = (await api.getPromise('repos', { id: id })).data,
          metrics = (await api.getPromise('metrics', { id: id })).data;
    progress.init('Get Commits and PRs', repos.repos.length);
    const completed = Object.keys(COMMITS.commits).length;
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
    COMMITS = (await api.getPromise('commits', { id: id })).data;
    PRS = (await api.getPromise('prs', { id: id })).data;
    progress.end();
  }

  async function calcStats() {
    COMMITS.stats = {
      list: []
    };
    Object.entries(COMMITS.commits).forEach(([project, coms]) => {
      COMMITS.stats.list.push(coms.length);
    });
    COMMITS.stats.total = COMMITS.stats.list.reduce((prev, curr) => prev + curr, 0);
    COMMITS.stats.avg = COMMITS.stats.list.reduce((prev, curr) => prev + curr, 0) / COMMITS.stats.list.length;
    let sorted = [...COMMITS.stats.list].sort((a, b) => a - b);
    COMMITS.stats.med = sorted.length % 2 === 1 ? sorted[Math.floor(sorted.length / 2)] : (sorted[sorted.length / 2- 1] + sorted[sorted.length / 2]) / 2;
    COMMITS.stats.min = Math.min(...COMMITS.stats.list);
    COMMITS.stats.max = Math.max(...COMMITS.stats.list);
    PRS.stats = {
      list: []
    };
    Object.entries(PRS.prs).forEach(([project, pulls]) => {
      PRS.stats.list.push(pulls.length);
    });
    PRS.stats.total = PRS.stats.list.reduce((prev, curr) => prev + curr, 0);
    PRS.stats.avg = PRS.stats.list.reduce((prev, curr) => prev + curr, 0) / PRS.stats.list.length;
    sorted = [...PRS.stats.list].sort((a, b) => a - b);
    PRS.stats.med = sorted.length % 2 === 1 ? sorted[Math.floor(sorted.length / 2)] : (sorted[sorted.length / 2- 1] + sorted[sorted.length / 2]) / 2;
    PRS.stats.min = Math.min(...PRS.stats.list);
    PRS.stats.max = Math.max(...PRS.stats.list);
    await api.postPromise('commits', { id: id, data: COMMITS });
    await api.postPromise('prs', { id: id, data: PRS });
  }

  async function mineRefactorings() {
    const total = Object.keys(COMMITS.commits).length;
    progress.init('Mine refactorings from commits', total);
    const commitsArray = Array.from(Object.entries(COMMITS.commits));
    const completed = Object.keys(REFACTORINGS.refactorings).length;
    if (completed > 0) progress.setStartIndex(completed);
    for (let i = completed; i < total && progress.status === 1; i++) {
      const repo = commitsArray[i][0],
            commits = commitsArray[i][1];
      progress.setProgress(i, total);
      const shas = commits.reduce((prev, curr) => {
        prev.push(curr.sha);
        return prev;
      }, []);
      const repoOwner = repo.split('/')[0],
            repoName = repo.split('/')[1];
      try {
        const response = await api.postPromise('findRefactorings', {
          owner: repoOwner,
          repo: repoName,
          commits: shas
        });
        const data = response.data;
        REFACTORINGS.refactorings[repo] = REFACTORINGS.refactorings[repo] || {};
        data.forEach(commitRefactorings => {
          REFACTORINGS.refactorings[repo][commitRefactorings.commitSha] = commitRefactorings.refactorings;
        });
        await api.postPromise('refactorings', { id: id, repo: repo, data: REFACTORINGS.refactorings[repo] });
      }
      catch(e) {
        console.error('Error retrieving refactorings, make sure the Java server is running');
        return;
      }
    }
    progress.end();
  }
  
  async function mineRefactorings2() {
    const total = Object.keys(COMMITS.commits).length;
    progress.init('Mine refactorings from commits (JSDiffer)', total);
    const commitsArray = Array.from(Object.entries(COMMITS.commits));
    let completed = 0;
    const oldRefs = Array.from(Object.values(REFACTORINGS.refactorings));
    for (let i = 0; i < total; i++) {
      let found = false;
      Object.values(oldRefs[i]).forEach(commit => {
        commit.forEach(ref => {
          if (ref.tool === 'jsdiffer') found = true;
        });
      });
      if (found) completed = i;
    }
    if (completed > 0) progress.setStartIndex(completed);
    for (let i = completed; i < total && progress.status === 1; i++) {
      const repo = commitsArray[i][0],
            commits = commitsArray[i][1];
      progress.setProgress(i, total);
      const shas = commits.reduce((prev, curr) => {
        prev.push(curr.sha);
        return prev;
      }, []);
      const repoOwner = repo.split('/')[0],
            repoName = repo.split('/')[1];
      try {
        const response = await api.postPromise('findRefactoringsJsDiffer', {
          owner: repoOwner,
          repo: repoName,
          commits: shas
        });
        const data = response.data;
        REFACTORINGS.refactorings[repo] = REFACTORINGS.refactorings[repo] || {};
        data.forEach(commitRefactorings => {
          REFACTORINGS.refactorings[repo][commitRefactorings.commitSha] = REFACTORINGS.refactorings[repo][commitRefactorings.commitSha] || [];
          REFACTORINGS.refactorings[repo][commitRefactorings.commitSha].push(...commitRefactorings.refactorings);
        });
        await api.postPromise('refactorings', { id: id, repo: repo, data: REFACTORINGS.refactorings[repo] });
      }
      catch(e) {
        console.error('Error retrieving refactorings, make sure the Java server is running');
        return;
      }
    }
    progress.end();
  }

  $('[data-a="download"]').on('click', () => {
    getCommitsAndPrs();
  });

  $('[data-a="stats"]').on('click', () => {
    calcStats();
  });

  $('[data-a="refactorings"]').on('click', () => {
    mineRefactorings();
  });

  $('[data-a="refactorings2"]').on('click', () => {
    mineRefactorings2();
  });

  $('[data-e="commit-filter').on('change', buildPage);

})();