(function () {
  // Init tooltips
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });

  let data;

  function buildPage() {
    const tbody = $('[data-e="project-list"] tbody'),
          template = $($('[data-t="project-list-item"]').html());
    tbody.html('');
    for (let i = 0; i < data.projects.length; i++) {
      const project = data.projects[i],
            html = template.clone(true);
      html.data('index', i);
      html.data('id', project.id);
      html.find('[data-e="project-index"]').text(i + 1);
      html.find('[data-e="project-name"]').text(project.name).attr('href', `/ui/project?id=${project.id}`);
      html.find('[data-e="project-type"]').text(project.type);
      html.find('[data-e="project-size"]').text(project.size);
      html.find('[data-e="project-languages"]').text(project.languages.join(', '));
      html.find('[data-e="project-query"]').text(project.query);
      if (project.has_randoms) html.find('[data-e="project-randoms"]').show();
      if (project.has_counts) html.find('[data-e="project-counts"]').show();
      if (project.has_repos) html.find('[data-e="project-repos"]').show();
      tbody.append(html);
    }
  }

  api.get('projects', {
  }, (response) => {
    data = response.data;
    buildPage();
  }, (error) => {
    console.warn(error);
    $('[data-e="error-load"]').show();
  });

  $('[data-a="create-project"]').on('click', (e) => {
    e.preventDefault();
    const project = {};
    $(e.target).closest('form').find('input, select').each(function() {
      const property = this.name.replace('project-', '');
      project[property] = this.value;
    });
    api.post('project', {
      project: project
    }, (response) => {
      const project = response.data;
      data.projects.push(project);
      buildPage();
      const alert = $('[data-e="success"]');
      alert.html('Successfully created project').show();
      setTimeout(() => {
        alert.hide();
      }, 3000);
    }, (err) => {
      console.log(err);
      const alert = $('[data-e="error"]');
      alert.html(err.statusText).show();
      setTimeout(() => {
        alert.hide();
      }, 3000);
    });
  });
})();