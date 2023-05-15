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
    $('[data-e="project-type"]').text(project.type);
    $('[data-e="project-size"]').text(project.size);
    $('[data-e="project-languages"]').text(project.languages.join(', '));
    $('[data-e="project-query"]').text(project.query);
  
    if (project.type === 'github') {
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
    }
    else {
      $('#counts-content').closest('.accordion-item').remove();
    }

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
  
    if (project.has_repos) {
      const createButton = $('[data-a="create-repos"]'),
            openButton = $('[data-a="open-repos"]');
      createButton.hide();
      openButton.attr('href', `/ui/repos?id=${id}`);
      openButton.show();
    }

    $('[data-a="open-evaluation"]').attr('href', `/ui/evaluation?id=${id}`);
  }, (error) => {
    console.warn(error);
    $('[data-e="error-load"]').show();
  });

  $('[data-a="create-randoms"]').on('click', async () => {
    if (project.type === 'github') {
      if (!counts) {
        const alert = $('[data-e="error"]');
        alert.html('Counts need to be calculated first').show();
        setTimeout(() => {
          alert.hide();
        }, 3000);
        return;
      }
      progress.init('Create randoms', 1);
      api.post('randoms', {
        id: id,
        number: project.size,
        max: counts.total
      }, (response) => {
        randoms = response.data;
        project.has_randoms = true;
        buildRandoms();
        const alert = $('[data-e="success"]');
        alert.html(response.msg).show();
        setTimeout(() => {
          alert.hide();
        }, 3000);
        progress.setProgress(1, 1);
        progress.end();
      }, (err) => {
        const alert = $('[data-e="error"]');
        alert.html(err.statusText).show();
        setTimeout(() => {
          alert.hide();
        }, 3000);
        progress.end();
      });
    }
    else if (project.type === 'npm') {
      progress.init('Create randoms', 2);
      const total = await api.getPromise('npmtotal');
      console.log(total.data.total);
      progress.setProgress(1, 2);
      api.post('randoms', {
        id: id,
        number: project.size * 10,
        max: total.data.total,
        unordered: true
      }, (response) => {
        randoms = response.data;
        project.has_randoms = true;
        project.total = total.data.total;
        buildRandoms();
        const alert = $('[data-e="success"]');
        alert.html(response.msg).show();
        setTimeout(() => {
          alert.hide();
        }, 3000);
        progress.setProgress(2, 2);
        progress.end();
      }, (err) => {
        const alert = $('[data-e="error"]');
        alert.html(err.statusText).show();
        setTimeout(() => {
          alert.hide();
        }, 3000);
        progress.end();
      });
    }
  });

  $('[data-a="create-counts"]').on('click', async () => {
    if (!project) {
      const alert = $('[data-e="error"]');
      alert.html('Project data is missing').show();
      setTimeout(() => {
        alert.hide();
      }, 3000);
      return;
    }
    const settings = {
      startDateFormat: '20YY-MM-DD',
      endDateFormat: '20YY-MM-DD',
      startYear: 7,
      endYear: `${new Date().getFullYear()}`.slice(-2)
    };
    settings.total = (settings.endYear - settings.startYear) * project.languages.length;
    const result = {
      valid: true,
      total: 0,
      results: []
    }
    progress.init('Create counts', settings.total);
    for (let i = 0; i < project.languages.length; i++) {
      const language = project.languages[i];
      for (let year = settings.startYear, k = i * (settings.total / project.languages.length); year <= settings.endYear && progress.status === 1; year++) {
        progress.setProgress(k++, settings.total);
        let sYear = '' + year;
        if (sYear.length === 1) sYear = '0' + sYear;
        let dates = `${settings.startDateFormat.replace('YY', sYear).replace('MM', '01').replace('DD', '01')}..${settings.endDateFormat.replace('YY', sYear).replace('MM', '12').replace('DD', '31')}`;
        let query = project.full_query.replace('{{language}}', language).replace('{{dates}}', dates);
        let response = await api.postPromise('totalrepos', {
          query: query
        });
        console.log(`${language}-20${sYear}: Found a total of ${response.data.total} repositories`);
        if (response.data.invalid) {
          const getLastDay = (year, month) => {
            return new Date(year, month, 0).getDate();
          };
          console.log(`Result incomplete, retrying with smaller timeframe`);
          const cycles = 3;
          for (let i = 0; i < cycles; i++) {
            let startMonth = `${12 / cycles * i + 1}`,
                endMonth = `${12 / cycles * i + 12 / cycles}`,
                startDay = '01',
                endDay = '' + getLastDay(parseInt(`20${sYear}`), parseInt(endMonth));
            if (startMonth.length === 1) startMonth = '0' + startMonth;
            if (endMonth.length === 1) endMonth = '0' + endMonth;
            if (endDay.length === 1) endDay = '0' + endDay;
            dates = `${settings.startDateFormat.replace('YY', sYear).replace('MM', startMonth).replace('DD', startDay)}..${settings.endDateFormat.replace('YY', sYear).replace('MM', endMonth).replace('DD', endDay)}`;
            query = project.full_query.replace('{{language}}', language).replace('{{dates}}', dates);
            response = await api.postPromise('totalrepos', {
              query: query
            });
            console.log(`-> ${language}-20${sYear}-part${i}: Found a total of ${response.data.total} repositories`);
            if (response.data.total > 0) {
              result.results.push({
                timeframe: dates,
                language: language,
                valid: !response.data.invalid,
                total: response.data.total
              });
              result.total += response.data.total;
            }
          }
        }
        else {
          result.results.push({
            timeframe: dates,
            language: language,
            valid: !response.data.invalid,
            total: response.data.total
          });
          result.total += response.data.total;
        }
      }
    }
    counts = result;
    buildCounts();
    await api.postPromise('counts', {
      id: id,
      data: counts
    });
    project.has_counts = true;
    progress.end();
  });

  $('[data-a="create-repos"]').on('click', async () => {
    if (project.type === 'github') {
      if (!counts || !randoms) {
        const alert = $('[data-e="error"]');
        alert.html('Counts and randoms need to be calculated first').show();
        setTimeout(() => {
          alert.hide();
        }, 3000);
        return;
      }
      const settings = {
        input_date_format: 'YYYY-MM-DD',
        date_format: 'YYYY-MM-DDTHH:mm:ss',
        gitHubLimit: 1000
      };
      const randomArr = randoms.split(',');
      const newCounts = [];
      let total = 0;
      progress.init('Retrieve repos', randomArr.length);
      for (let i = 0; i < counts.results.length; i++) {
        const current = counts.results[i],
              dates = current.timeframe.split('..');
        newCounts.push({
          start_date: date.parse(dates[0], settings.input_date_format, true),
          end_date: date.addMilliseconds(date.addDays(date.parse(dates[1], settings.input_date_format, true), 1), -1),
          start_count: total + 1,
          end_count: total + current.total,
          range_count: current.total,
          language: current.language
        });
        total += current.total;
      }
      let result = {
        repos: [],
        errors: []
      };
      // Download already processed repos
      const reposExist = await api.getPromise('exists', {
              type: 'project',
              file: 'repos.json',
              vars: id
            }),
            repoResponse = reposExist.data.exists ? await api.getPromise('repos', {
              id: id
            }) : null,
            completedRepos = repoResponse ? repoResponse.data.repos.length + repoResponse.data.errors.length : 0;
      if (completedRepos > 0) {
        progress.setStartIndex(completedRepos);
        result = repoResponse.data;
      }
      for (let i = completedRepos; i < randomArr.length && progress.status === 1; i++) {
        progress.setProgress(i, randomArr.length);
        const random = randomArr[i];
        for (let k = 0; k < newCounts.length && progress.status === 1; k++) {
          const current = newCounts[k];
          if (random <= current.end_count) {
            const defineQuery = async (count_obj, number) => {
              if (count_obj.range_count <= settings.gitHubLimit || number < count_obj.start_count + settings.gitHubLimit) {
                return count_obj;
              }
              else {
                const splitSeconds = date.subtract(count_obj.end_date, count_obj.start_date).toSeconds() / 2,
                      firstEndDate = date.addSeconds(count_obj.start_date, splitSeconds),
                      secondStartDate = date.addSeconds(count_obj.start_date, splitSeconds + 1),
                      dates = `${date.format(count_obj.start_date, settings.date_format, true)}..${date.format(firstEndDate, settings.date_format, true)}`,
                      query = project.full_query.replace('{{language}}', count_obj.language).replace('{{dates}}', dates),
                      responseRaw = await api.postPromise('totalrepos', {
                        query: query
                      }),
                      response = responseRaw.data,
                      firstCount = {
                        start_date: count_obj.start_date,
                        end_date: date.addMilliseconds(date.addSeconds(firstEndDate, 1), -1),
                        start_count: count_obj.start_count,
                        end_count: count_obj.start_count + response.total - 1,
                        range_count: response.total,
                        language: count_obj.language
                      },
                      secondCount = {
                        start_date: secondStartDate,
                        end_date: count_obj.end_date,
                        start_count: count_obj.start_count + response.total,
                        end_count: count_obj.end_count,
                        range_count: count_obj.end_count - (count_obj.start_count + response.total - 1),
                        language: count_obj.language
                      };
                newCounts.splice(newCounts.indexOf(count_obj), 1, firstCount, secondCount);
                if (number <= firstCount.end_count) {
                  return defineQuery(firstCount, number);
                }
                else {
                  return defineQuery(secondCount, number);
                }
              }
            }
            const count_obj = await defineQuery(current, random),
                  dates = `${date.format(count_obj.start_date, settings.date_format, true)}..${date.format(count_obj.end_date, settings.date_format, true)}`,
                  query = project.full_query.replace('{{language}}', count_obj.language).replace('{{dates}}', dates);
            try {
              const response = await api.postPromise('searchrepo', {
                query: query,
                index: random - count_obj.start_count + 1
              });
              if (response.data.items.length !== 1) {
                console.error(`[Error] Repository not found for query "${query}"`);
                result.errors.push({
                  query: query,
                  response_total: response.data.total_count,
                  response: response.data,
                  count: count_obj,
                  random: random,
                  index: random - count_obj.start_count + 1
                });
              }
              else {
                console.log(`#${i + 1}: ${random} -> ${response.data.items[0].full_name}`);
                result.repos.push(response.data.items[0]);
              }
              await api.postPromise('repos', {
                id: id,
                data: result
              });
            }
            catch (e) {
              console.error(`[Error] Problem with GitHub API for query "${query}"`);
              result.errors.push({
                query: query,
                response: e,
                count: count_obj,
                random: random,
                index: random - count_obj.start_count + 1
              });
              await api.postPromise('repos', {
                id: id,
                data: result
              });
            }
            break;
          }
        }
      }
      repos = result;
      await api.postPromise('repos', {
        id: id,
        data: repos
      });
    }
    else if (project.type === 'npm') {
      if (!randoms) {
        const alert = $('[data-e="error"]');
        alert.html('Randoms need to be calculated first').show();
        setTimeout(() => {
          alert.hide();
        }, 3000);
        return;
      }
      const randomArr = randoms.split(',');
      progress.init('Retrieve repos', project.size);
      const npmall = await api.getPromise('npmall', {
        includeContent: true
      });
      if (!npmall.data.fetched || !npmall.data.minified) {
        const alert = $('[data-e="error"]');
        alert.html('All NPM package data need to be fetched first').show();
        setTimeout(() => {
          alert.hide();
        }, 3000);
        progress.end();
        return;
      }
      let result = {
        repos: [],
        skipped: 0,
        skipReasons: {
          1: {
            reason: 'Not found on NPM',
            total: 0
          },
          2: {
            reason: 'No git repo connected',
            total: 0
          },
          3: {
            reason: 'Repo is other than GitHub',
            total: 0
          },
          4: {
            reason: 'Repo does not exist (anymore)',
            total: 0
          },
          5: {
            reason: 'Repo language not of interest',
            total: 0,
            languages: {}
          }
        },
        valid: false
      };
      // Download already processed repos
      const reposExist = await api.getPromise('exists', {
              type: 'project',
              file: 'repos.json',
              vars: id
            }),
            repoResponse = reposExist.data.exists ? await api.getPromise('repos', {
              id: id
            }) : null,
            completedRepos = repoResponse ? repoResponse.data.repos.length : 0,
            lastIndex = repoResponse ? completedRepos + repoResponse.data.skipped : 0;
      if (completedRepos > 0) {
        progress.setStartIndex(completedRepos);
        result = repoResponse.data;
      }
      for (let i = lastIndex, c = completedRepos; i < randomArr.length && c < project.size && progress.status === 1; i++) {
        progress.setProgress(c, project.size);
        const random = randomArr[i];
        const npmName = npmall.data.data.names[random];
        let npmResponse = await api.getPromise('npmpackage', {
          name: encodeURIComponent(npmName)
        });
        if (npmResponse === null || !npmResponse.data.success) {
          result.skipped++;
          result.skipReasons[1].total++;
          continue;
        }
        const npmPackage = npmResponse.data.data;
        if (!npmPackage.repository || npmPackage.repository.type !== 'git' || !npmPackage.repository.url) {
          result.skipped++;
          result.skipReasons[2].total++;
          continue;
        }
        const repoName = npmPackage.repository.url.match(/(?<=github\.com\/)[^\.]+\/[^\.]+/);
        if (!repoName) {
          result.skipped++;
          result.skipReasons[3].total++;
          continue;
        }
        const [ owner, repo ] = repoName[0].split('/');
        const repoResponse = await api.getPromise('githubrepo', {
          owner: owner,
          repo: repo
        });
        if (!repoResponse || !repoResponse.data.success) {
          result.skipped++;
          result.skipReasons[4].total++;
          continue;
        }
        const repoData = repoResponse.data.data;
        if (!project.languages.includes(repoData.language)) {
          result.skipped++;
          result.skipReasons[5].total++;
          result.skipReasons[5].languages[repoData.language] = result.skipReasons[5].languages[repoData.language] || 0;
          result.skipReasons[5].languages[repoData.language]++;
          continue;
        }
        repoData.npm_package_data = npmPackage;
        result.repos.push(repoData);
        c++;
        console.log(`${(c/(i+1)*100).toFixed(2)}% successfull repos ${c}/${i+1}`);
        await api.postPromise('repos', {
          id: id,
          data: result
        });
      }
      if (result.repos.length === project.size) {
        console.log("Successfully fetched repos");
        result.valid = true;
      }
      else {
        console.log("Number of randoms was not enough, try again with bigger set of randoms");
      }
      repos = result;
      await api.postPromise('repos', {
        id: id,
        data: repos
      });
    }
    const createButton = $('[data-a="create-repos"]'),
          openButton = $('[data-a="open-repos"]');
    createButton.hide();
    openButton.attr('href', `/ui/repos?id=${id}`);
    openButton.show();
    project.has_repos = true;
    progress.end();
  });

})();