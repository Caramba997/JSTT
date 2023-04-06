(function () {
  const search = new URLSearchParams(location.search),
        path = search.get('path');
  if (!path) {
    $('[data-e="error-load"]').show();
    return;
  }
  
  let data;

  function buildPage() {
    const tbody = $('[data-e="repo-list"] tbody'),
          template = $($('[data-t="repo-list-item"]').html()),
          statsExist = data.stats ? true : false,
          stats = data.stats || {
            name: path,
            total: data.repos.length,
            js: 0,
            ts: 0,
            org: 0,
            individual: 0,
            maxstars: 0,
            minstars: 100000000,
            npm: 0,
            prs: 0,
            commits: 0
          };
    for (let i = 0; i < data.repos.length; i++) {
      const repo = data.repos[i],
            html = template.clone(true);
      if (!statsExist) {
        if (repo.language === 'JavaScript') stats.js++;
        if (repo.language === 'TypeScript') stats.ts++;
        if (repo.owner.type === 'Organization') stats.org++;
        if (repo.owner.type === 'User') stats.individual++;
        stats.maxstars = Math.max(stats.maxstars, repo.stargazers_count);
        stats.minstars = Math.min(stats.minstars, repo.stargazers_count);
        data.stats = stats;
      }
      html.data('index', i);
      html.data('id', repo.full_name);
      html.find('[data-e="repo-index"]').text(i + 1);
      html.find('[data-e="repo-name"]').text(repo.full_name).attr('href', `/ui/repo?name=${repo.full_name}`);
      html.find('[data-e="repo-language"]').text(repo.language);
      html.find('[data-e="repo-stars"]').text(repo.stargazers_count);
      html.find('[data-e="repo-created"]').text(repo.created_at);
      html.find('[data-e="repo-modified"]').text(repo.updated_at);
      html.find('a[data-e="repo-git"]').attr('href', repo.html_url);
      tbody.append(html);
    }
    Array.from(Object.entries(stats)).forEach(([key, value]) => {
      $(`[data-e="stats-${key}"]`).text(value);
    });
  }

  api.get('results', {
    path: path
  }, (response) => {
    data = response.data;
    buildPage();
  }, (error) => {
    console.warn(error);
    $('[data-e="error-load"]').show();
  });

  $('[data-a="save"]').on('click', () => {
    api.post('results', {
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
      alert.html(err.msg).show();
      setTimeout(() => {
        alert.hide();
      }, 3000);
    });
  });

  $('[data-a="check-npm"]').on('click', () => {
    api.post('checknpm', {
      data: data
    }, (response) => {
      data = response.data;
      buildPage(data);
      const alert = $('[data-e="success"]');
      alert.html(response.msg).show();
      setTimeout(() => {
        alert.hide();
      }, 3000);
    }, (err) => {
      const alert = $('[data-e="error"]');
      alert.html(err.msg).show();
      setTimeout(() => {
        alert.hide();
      }, 3000);
    });
  });
})();