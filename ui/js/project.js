(function () {
  const search = new URLSearchParams(location.search),
        id = search.get('id');
  if (!id) {
    $('[data-e="error-load"]').html('Id search parameter missing (E.g. ?id=version_1)').show();
    return;
  }
  
  let project, randoms, counts, repos;

  function buildRandoms() {
    if (!randoms) return;
    const element = $('[data-e="randoms"]'),
          btn = $('[data-a="create-randoms"]');
    element.text(randoms.replace(/,/g, ', '));
    btn.hide();
  }
  
  function buildCounts() {
    if (!counts) return;
    const tbody = $('[data-e="counts"] tbody'),
          template = $($('[data-t="counts-item"]').html()),
          btn = $('[data-a="create-counts"]');
    btn.hide();
    $('[data-e="counts-stats-total"]').text(counts.total);
    $('[data-e="counts-stats-valid"]').text(counts.valid);
    tbody.html('');
    for (let i = 0; i < counts.results.length; i++) {
      const count = counts.results[i],
            html = template.clone(true);
      html.data('index', i);
      html.data('id', count.timeframe);
      html.find('[data-e="counts-index"]').text(i + 1);
      html.find('[data-e="counts-timeframe"]').text(count.timeframe);
      html.find('[data-e="counts-language"]').text(count.language);
      html.find('[data-e="counts-total"]').text(count.total);
      tbody.append(html);
    }
  }

  api.get('project', {
    id: id
  }, (response) => {
    project = response.data;
    $('[data-e="project-name"]').text(project.name);
    $('[data-e="project-id"]').text(project.id);
    $('[data-e="project-size"]').text(project.size);
    $('[data-e="project-languages"]').text(project.languages.join(', '));
    $('[data-e="project-query"]').text(project.query);

    if (project.has_randoms) {
      api.get('randoms', {
        id: id
      }, (response) => {
        randoms = response.data;
        buildRandoms();
      }, (error) => {
        console.warn(error);
        $('[data-e="error-load"]').show();
      });
    }
  
    if (project.has_counts) {
      api.get('counts', {
        id: id
      }, (response) => {
        counts = response.data;
        buildCounts();
      }, (error) => {
        console.warn(error);
        $('[data-e="error-load"]').show();
      });
    }
  
    if (project.has_repos) {
      const createButton = $('[data-a="create-repos"]'),
            openButton = $('[data-a="open-repos"]');
      createButton.hide();
      openButton.attr('href', `/ui/repos?id=${id}`);
      openButton.show();
    }
  }, (error) => {
    console.warn(error);
    $('[data-e="error-load"]').show();
  });

  $('[data-a="create-randoms"]').on('click', () => {
    api.post('randoms', {
      path: path,
      data: data
    }, (response) => {
      const alert = $('[data-e="success"]');
      alert.html(response.msg).show();
      setTimeout(() => {
        alert.hide();
      }, 3000);
    }, (err) => {
      const alert = $('[data-e="error"]');
      alert.html(err.statusText).show();
      setTimeout(() => {
        alert.hide();
      }, 3000);
    });
  });
})();