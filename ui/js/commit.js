(async function () {
  const search = new URLSearchParams(location.search),
        id = search.get('id'),
        repo = search.get('repo'),
        sha = search.get('sha');
  if (!id) {
    $('[data-e="error-load"]').html('Id search parameter missing (E.g. ?id=version_1)').show();
    return;
  }

  let COMMIT = (await api.getPromise('commits', { id: id, repo: repo, sha: sha })).data,
      PRS = (await api.getPromise('prs', { id: id, repo: repo })).data,
      REFACTORINGS = (await api.getPromise('refactorings', { id: id, repo: repo, sha: sha })).data,
      METRICS = (await api.getPromise('metrics', { id: id, repo: repo })).data;
  buildPage();

  function buildPage() {
    const statsElement = $('[data-e="info"]');
    statsElement.find('[data-e="info-repo"]').text(repo);
    statsElement.find('[data-e="info-sha"]').text(sha);
    statsElement.find('[data-e="info-refactorings"]').text(REFACTORINGS.length);
    statsElement.find('[data-e="info-prs"]').text(COMMIT.prs && COMMIT.prs.length || 0);
    if (COMMIT.prs && COMMIT.prs.length === 1) {
      const prButton = $('[data-e="commit-pr"]');
      prButton.show();
      let pr = null;
      for (let i = 0; i < PRS.length; i++) {
        if (PRS[i].number === COMMIT.prs[0]) {
          pr = PRS[i];
          break;
        }
      }
      if (pr) prButton.attr('href', pr.html_url);
    }
    const tbody = $('[data-e="refactorings-list"] tbody'),
          template = $($('[data-t="refactorings-list-item"]').html());
    tbody.html('');
    for (let i = 0; i < REFACTORINGS.length; i++) {
      const ref = REFACTORINGS[i],
            html = template.clone(true);
      const isTRButton = html.find('[data-a="testability-refactoring"]');
      isTRButton.on('click', async () => {
        progress.init('Toggle testability refactoring', 1);
        if (ref.is_testability_refactoring === true) {
          delete ref.is_testability_refactoring;
          $('[data-a="testability-refactoring"]').removeClass('btn-success').addClass('btn-danger').html('<i class="fa-solid fa-xmark"></i>');
        }
        else {
          ref.is_testability_refactoring = true;
          $('[data-a="testability-refactoring"]').removeClass('btn-danger').addClass('btn-success').html('<i class="fa-solid fa-check"></i>');
        }
        await api.postPromise('refactorings', { id: id, repo: repo, sha: sha, data: REFACTORINGS });
        progress.setProgress(1, 1);
        progress.end();
      });
      if (ref.is_testability_refactoring) isTRButton.removeClass('btn-danger').addClass('btn-success').html('<i class="fa-solid fa-check"></i>');
      html.find('[data-e="refactoring-index"]').text(i + 1);
      html.find('[data-e="refactoring-type"]').text(ref.type);
      html.find('[data-e="refactoring-revision"]').text('BEFORE');
      html.find('[data-e="refactoring-location"]').text(ref.tool === 'jsdiffer' ? '-' : ref.nodeBefore.type);
      html.find('[data-e="refactoring-file"]').text(ref.tool === 'jsdiffer' ? ref.locationBefore.split(':')[0] : ref.nodeBefore.location.file);
      let testFile = '';
      if (METRICS.testConnections) {
        const testCons = Array.from(Object.entries(METRICS.testConnections));
        for (let k = 0; k < testCons.length; k++) {
          const con = testCons[k];
          if (typeof con[1] === 'string' && con[1].match(new RegExp(`.*${ref.tool === 'jsdiffer' ? ref.locationBefore.split(':')[0] : ref.nodeBefore.location.file.replace('.', '\\.').replace('-', '\\-')}`))) {
            testFile = con[0];
            break;
          }
        }
      }
      html.find('[data-e="refactoring-test-file"]').text(testFile.split('/').splice(-1)).attr('title', testFile);
      html.find('[data-e="refactoring-line"]').text(ref.tool === 'jsdiffer' ? ref.locationBefore.split(':')[1] : ref.nodeBefore.location.line);
      html.find('[data-e="refactoring-simple-name"]').text(ref.tool === 'jsdiffer' ? '-' : ref.nodeBefore.simpleName);
      html.find('[data-e="refactoring-local-name"]').text(ref.tool === 'jsdiffer' ? ref.localNameBefore : ref.nodeBefore.localName);
      html.find('[data-e="refactoring-parameters"]').text(ref.tool === 'jsdiffer' ? '-' : ref.nodeBefore.parameters.reduce((prev, curr) => `${prev}${prev ? ', ' : ''}${curr.name}`, ''));
      html.find('[data-e="refactoring-revision-a"]').text('AFTER');
      html.find('[data-e="refactoring-location-a"]').text(ref.tool === 'jsdiffer' ? '-' : ref.nodeAfter.type);
      html.find('[data-e="refactoring-file-a"]').text(ref.tool === 'jsdiffer' ? ref.locationAfter.split(':')[0] : ref.nodeAfter.location.file);
      testFile = '';
      if (METRICS.testConnections) {
        const testCons = Array.from(Object.entries(METRICS.testConnections));
        for (let k = 0; k < testCons.length; k++) {
          const con = testCons[k];
          if (typeof con[1] === 'string' && con[1].match(new RegExp(`.*${(ref.tool === 'jsdiffer' ? ref.locationAfter.split(':')[0] : ref.nodeAfter.location.file).replace('.', '\\.').replace('-', '\\-')}`))) {
            testFile = con[0];
            break;
          }
        }
      }
      html.find('[data-e="refactoring-test-file-a"]').text(testFile.split('/').splice(-1)).attr('title', testFile);
      html.find('[data-e="refactoring-line-a"]').text(ref.tool === 'jsdiffer' ? ref.locationAfter.split(':')[1] : ref.nodeAfter.location.line);
      html.find('[data-e="refactoring-simple-name-a"]').text(ref.tool === 'jsdiffer' ? '-' : ref.nodeAfter.simpleName);
      html.find('[data-e="refactoring-local-name-a"]').text(ref.tool === 'jsdiffer' ? ref.localNameAfter : ref.nodeAfter.localName);
      html.find('[data-e="refactoring-parameters-a"]').text(ref.tool === 'jsdiffer' ? '-' : ref.nodeAfter.parameters.reduce((prev, curr) => `${prev}${prev ? ', ' : ''}${curr.name}`, ''));
      tbody.append(html);
    }

    $('[data-a="done"]').prop('disabled', false).addClass(COMMIT.is_done ? 'btn-success' : 'btn-danger');
    $('[data-e="commit-git"]').attr('href', COMMIT.html_url);

    // Init tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
      return new bootstrap.Tooltip(tooltipTriggerEl);
    });
  }

  $('[data-a="refactorings-link"]').attr('href', `/ui/refactorings?id=${id}`);

  $('[data-a="done"]').on('click', async () => {
    progress.init('Toggle todo state', 1);
    if (COMMIT.is_done === true) {
      delete COMMIT.is_done;
      $('[data-a="done"]').removeClass('btn-success').addClass('btn-danger').text('TODO');
    }
    else {
      COMMIT.is_done = true;
      $('[data-a="done"]').removeClass('btn-danger').addClass('btn-success').html('<i class="fa-solid fa-check"></i>');
    }
    await api.postPromise('commits', {
      id: id,
      repo: repo,
      sha: sha,
      data: COMMIT
    });
    progress.setProgress(1, 1);
    progress.end();
  });

})();