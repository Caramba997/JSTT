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
  
  const commentModal = $('[data-e="comment-modal"]');
  const commentModalB = new bootstrap.Modal(commentModal, {
    backdrop: 'static',
    keyboard: false
  });

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
          isTRButton.removeClass('btn-success').addClass('btn-danger').html('<i class="fa-solid fa-xmark"></i>');
        }
        else {
          ref.is_testability_refactoring = true;
          isTRButton.removeClass('btn-danger').addClass('btn-success').html('<i class="fa-solid fa-check"></i>');
        }
        await api.postPromise('refactorings', { id: id, repo: repo, sha: sha, data: REFACTORINGS });
        progress.setProgress(1, 1);
        progress.end();
      });
      if (ref.is_testability_refactoring) isTRButton.removeClass('btn-danger').addClass('btn-success').html('<i class="fa-solid fa-check"></i>');
      html.find('[data-e="refactoring-index"]').text(i + 1);
      html.find('[data-e="refactoring-type"]').text(ref.type);
      html.find('[data-a="edit_comment"]').attr('data-index', i);
      if (ref.comment) {
        html.find('[data-e="refactoring-type"]').attr('title', ref.comment);
        html.find('[data-a="edit_comment"]').removeClass('btn-outline-warning').addClass('btn-warning');
      }
      html.find('[data-e="refactoring-tool"]').text(ref.tool || 'RefDiff');
      html.find('[data-e="refactoring-revision"]').text('BEFORE');
      html.find('[data-e="refactoring-location"]').text(ref.tool === 'jsdiffer' ? '-' : ref.tool === 'manual' ? '-' : ref.nodeBefore.type);
      html.find('[data-e="refactoring-file"]').text(ref.tool === 'jsdiffer' ? ref.locationBefore.split(':')[0] : ref.tool === 'manual' ? ref.fileBefore : ref.nodeBefore.location.file);
      let testFile = '';
      if (METRICS.testConnections) {
        const testCons = Array.from(Object.entries(METRICS.testConnections));
        for (let k = 0; k < testCons.length; k++) {
          const con = testCons[k];
          const fileBefore = ref.tool === 'jsdiffer' ? ref.locationBefore.split(':')[0] : ref.tool === 'manual' ? ref.fileBefore : ref.nodeBefore.location.file;
          if (fileBefore && typeof con[1] === 'string' && con[1].match(new RegExp(`.*${fileBefore.replace('.', '\\.').replace('-', '\\-')}`))) {
            testFile = con[0];
            break;
          }
        }
      }
      html.find('[data-e="refactoring-test-file"]').text(testFile.split('/').splice(-1)).attr('title', testFile);
      html.find('[data-e="refactoring-line"]').text(ref.tool === 'jsdiffer' ? ref.locationBefore.split(':')[1] : ref.tool === 'manual' ? ref.lineBefore : ref.nodeBefore.location.line);
      html.find('[data-e="refactoring-simple-name"]').text(ref.tool === 'jsdiffer' || ref.tool === 'manual' ? '-' : ref.nodeBefore.simpleName);
      html.find('[data-e="refactoring-local-name"]').text(ref.tool === 'jsdiffer' ? ref.localNameBefore : ref.tool === 'manual' ? ref.nameBefore : ref.nodeBefore.localName);
      html.find('[data-e="refactoring-parameters"]').text(ref.tool === 'jsdiffer' ? '-' : ref.tool === 'manual' ? ref.parametersBefore : ref.nodeBefore.parameters.reduce((prev, curr) => `${prev}${prev ? ', ' : ''}${curr.name}`, ''));
      html.find('[data-e="refactoring-revision-a"]').text('AFTER');
      html.find('[data-e="refactoring-location-a"]').text(ref.tool === 'jsdiffer' || ref.tool === 'manual' ? '-' : ref.nodeAfter.type);
      html.find('[data-e="refactoring-file-a"]').text(ref.tool === 'jsdiffer' ? ref.locationAfter.split(':')[0] : ref.tool === 'manual' ? ref.fileAfter : ref.nodeAfter.location.file);
      testFile = '';
      if (METRICS.testConnections) {
        const testCons = Array.from(Object.entries(METRICS.testConnections));
        for (let k = 0; k < testCons.length; k++) {
          const con = testCons[k];
          const fileAfter = ref.tool === 'jsdiffer' ? ref.locationAfter.split(':')[0] : ref.tool === 'manual' ? ref.fileAfter : ref.nodeAfter.location.file;
          if (fileAfter && typeof con[1] === 'string' && con[1].match(new RegExp(`.*${fileAfter.replace('.', '\\.').replace('-', '\\-')}`))) {
            testFile = con[0];
            break;
          }
        }
      }
      html.find('[data-e="refactoring-test-file-a"]').text(testFile.split('/').splice(-1)).attr('title', testFile);
      html.find('[data-e="refactoring-line-a"]').text(ref.tool === 'jsdiffer' ? ref.locationAfter.split(':')[1] : ref.tool === 'manual' ? ref.lineAfter : ref.nodeAfter.location.line);
      html.find('[data-e="refactoring-simple-name-a"]').text(ref.tool === 'jsdiffer' || ref.tool === 'manual' ? '-' : ref.nodeAfter.simpleName);
      html.find('[data-e="refactoring-local-name-a"]').text(ref.tool === 'jsdiffer' ? ref.localNameAfter : ref.tool === 'manual' ? ref.nameAfter : ref.nodeAfter.localName);
      html.find('[data-e="refactoring-parameters-a"]').text(ref.tool === 'jsdiffer' ? '-' : ref.tool === 'manual' ? ref.parametersAfter : ref.nodeAfter.parameters.reduce((prev, curr) => `${prev}${prev ? ', ' : ''}${curr.name}`, ''));
      tbody.append(html);
    }

    $('[data-a="done"]').prop('disabled', false).addClass(COMMIT.is_done ? 'btn-success' : 'btn-danger').html(COMMIT.is_done ? '<i class="fa-solid fa-check"></i>' : 'TODO');
    $('[data-a="mark"]').prop('disabled', false).addClass(COMMIT.is_marked ? 'btn-warning' : 'btn-outline-warning').html(COMMIT.is_marked ? '<i class="fa-solid fa-exclamation"></i>' : 'Mark');
    $('[data-e="commit-git"]').on('click', (e) => {
      e.preventDefault();
      window.open(COMMIT.html_url, 'git', 'popup');
    });
  
    $('[data-a="edit_comment"]').on('click', async (e) => {
      const index = e.target.getAttribute('data-index');
      const comment = REFACTORINGS[parseInt(index)].comment;
      commentModal.find('[name="comment"]').val(comment || '')
      commentModal.data('index', index);
      commentModalB.show();
    });

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

  $('[data-a="mark"]').on('click', async () => {
    progress.init('Toggle mark', 1);
    if (COMMIT.is_marked === true) {
      delete COMMIT.is_marked;
      $('[data-a="mark"]').removeClass('btn-warning').addClass('btn-outline-warning').text('Mark');
    }
    else {
      COMMIT.is_marked = true;
      $('[data-a="mark"]').removeClass('btn-outline-warning').addClass('btn-warning').html('<i class="fa-solid fa-exclamation"></i>');
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
  
  const addModal = $('[data-e="add-modal"]');
  const addModalB = new bootstrap.Modal(addModal, {
    backdrop: 'static',
    keyboard: false
  });

  $('[data-a="add"]').on('click', async () => {
    const types = await api.getPromise('refactoringTypes');
    const select = addModal.find('[name="type"]');
    let manualHtml = '',
        toolHtml = '';
    types.data.types.forEach(type => {
      if (/^_.*$/.test(type)) {
        manualHtml += `<option value="${type}">${type}</option>`;
      }
      else {
        toolHtml += `<option value="${type}">${type}</option>`;
      }
    });
    select.html(`${select.html()}<optgroup label="Types for manual creation">${manualHtml}</optgroup><optgroup label="Other types from tools">${toolHtml}</optgroup>`);
    addModalB.show();
  });

  $('[data-a="save"]').on('click', async () => {
    addModalB.hide();
    progress.init('Save new refactoring', 1);
    const data = {
      tool: 'manual',
      is_testability_refactoring: addModal.find('[name="is_tr"]').is(':checked') ? true : false,
      type: addModal.find('[name="type"]').val(),
      fileBefore: addModal.find('[name="file_before"]').val(),
      lineBefore: addModal.find('[name="line_before"]').val(),
      nameBefore: addModal.find('[name="name_before"]').val(),
      parametersBefore: addModal.find('[name="parameters_before"]').val(),
      fileAfter: addModal.find('[name="file_after"]').val(),
      lineAfter: addModal.find('[name="line_after"]').val(),
      nameAfter: addModal.find('[name="name_after"]').val(),
      parametersAfter: addModal.find('[name="parameters_after"]').val(),
      comment: addModal.find('[name="comment"]').val()
    };
    REFACTORINGS.push(data);
    await api.postPromise('refactorings', { id: id, repo: repo, sha: sha, data: REFACTORINGS });
    buildPage();
    progress.setProgress(1, 1);
    progress.end();
  });

  $('[data-a="save_comment"]').on('click', async () => {
    commentModalB.hide();
    progress.init('Save edited comment', 1);
    const newComment = commentModal.find('[name="comment"]').val();
    if (newComment) {
      REFACTORINGS[parseInt(commentModal.data('index'))].comment = newComment;
    }
    else {
      delete REFACTORINGS[parseInt(commentModal.data('index'))].comment;
    }
    await api.postPromise('refactorings', { id: id, repo: repo, sha: sha, data: REFACTORINGS });
    buildPage();
    progress.setProgress(1, 1);
    progress.end();
  });

})();