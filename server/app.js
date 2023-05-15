const express = require('express');
const config = require('./config.js');
const root = require('app-root-path');
const fs = require('fs');
const bodyParser = require('body-parser');
const { GitHub } = require('../lib/github.js');
const { Random } = require('../lib/random.js');
const { Files } = require('../lib/files.js');
const { NPM } = require('../lib/npm.js');
const { Metrics } = require('../lib/metrics.js');
const { Correlations } = require('../lib/correlations.js');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json({limit: '50mb'}));
app.use(function logger(req, res, next) {
  if (req.path.match(/\/ui\//)) {
    if (config.logs === 'all') console.log(`[UI] ${req.method} ${req.path}`);
  }
  else {
    if (['all', 'api'].includes(config.logs)) console.log(`[API] ${req.method} ${req.path}`);
  }
  next();
});

const gitHub = new GitHub();
const random = new Random();
const files = new Files();
const npm = new NPM();
const metrics = new Metrics();
const correlations = new Correlations();

function success(res, data) {
  return res.send({
    ok: true,
    data: data
  });
}

function error(res, code, msg) {
  console.error(`ERROR: ${msg}`);
  res.statusMessage = msg;
  return res.status(code).end();
}

app.get(/^\/ui\/.*/, (req, res) => {
  const file = req.originalUrl.split('/ui/')[1].split('?')[0].split('#')[0],
        ending = file.match(/\.[^\.]+$/g),
        type = ending ? ending[0].replace('.', '') : 'html',
        path = `${root}/ui/${file.includes('/') ? '' : `${type}/`}${file}${type === 'html' ? '.html' : ''}`;
  res.sendFile(path);
});

app.get('/api/projects', async (req, res) => {
  try {
    const result = {
            projects: []
          };
    fs.readdirSync(files.path('projects', ''), { withFileTypes: true }).filter(dirent => dirent.isDirectory()).forEach(dir => {
      result.projects.push(files.json('project', 'project.json', [dir.name]));
    });
    return success(res, result);
  }
  catch (e) {
    return error(res, 500, 'Something went wrong');
  }
});

app.get('/api/project', async (req, res) => {
  const id = req.query.id;
  if (!id) return error(res, 400, 'Id missing');
  try {
    return success(res, files.json('project', 'project.json', [id]));
  }
  catch (e) {
    return error(res, 500, 'Something went wrong');
  }
});

app.post('/api/project', async (req, res) => {
  const project = req.body.project,
        name = project.name,
        id = name.toLowerCase().replace(/\s/g, '_');
  if (!project || !name) return error(res, 400, 'Data missing');
  if (files.exists('project', '', [id])) return error(res, 400, 'Name already exists');
  project.id = id;
  project.size = parseInt(project.size);
  project.languages = project.languages.replace(/\s/g, '').split(',');
  project.full_query = gitHub.createFullQuery(project.query);
  project.has_randoms = false;
  project.has_counts = false;
  project.has_repos = false;
  try {
    fs.mkdirSync(files.path('project', '', [id]));
    files.write('project', 'project.json', project, [id]);
    return success(res, project);
  }
  catch (e) {
    console.log(e);
    return error(res, 500, 'Something went wrong');
  }
});

app.get('/api/randoms', async (req, res) => {
  const id = req.query.id;
  if (!id) return error(res, 400, 'Id missing');
  try {
    const randoms = files.raw('project', 'randoms.txt', [id]);
    return success(res, randoms);
  }
  catch (e) {
    return error(res, 500, 'Something went wrong');
  }
});

app.post('/api/randoms', async (req, res) => {
  const id = req.body.id,
        number = req.body.number,
        max = req.body.max,
        unordered = req.body.unordered;
  if (!id || !number || !max) return error(res, 400, 'Param missing');
  try {
    let randoms;
    if (unordered) {
      randoms = await random.getUnordered(number, 1, max);
    }
    else {
      randoms = await random.get(number, 1, max);
    }
    files.write('project', 'randoms.txt', randoms, [id]);
    const project = files.json('project', 'project.json', [id]);
    project.has_randoms = true;
    project.total = max;
    files.write('project', 'project.json', project, [id]);
    return success(res, randoms);
  }
  catch (e) {
    console.log(e);
    return error(res, 500, 'Something went wrong');
  }
});

app.get('/api/counts', async (req, res) => {
  const id = req.query.id;
  if (!id) return error(res, 400, 'Id missing');
  try {
    const counts = files.json('project', 'counts.json', [id]);
    return success(res, counts);
  }
  catch (e) {
    return error(res, 500, 'Something went wrong');
  }
});

app.post('/api/counts', async (req, res) => {
  const id = req.body.id,
        data = req.body.data;
  if (!id || !data) return error(res, 400, 'Param missing');
  try {
    files.write('project', 'counts.json', data, [id]);
    const project = files.json('project', 'project.json', [id]);
    project.has_counts = true;
    files.write('project', 'project.json', project, [id]);
    return success(res, 'Successfully saved counts');
  }
  catch (e) {
    console.log(e);
    return error(res, 500, 'Something went wrong');
  }
});

app.post('/api/totalrepos', async (req, res) => {
  const query = req.body.query;
  if (!query) return error(res, 400, 'Param missing');
  try {
    const response = await gitHub.getTotalRepositories(query);
    return success(res, response);
  }
  catch (e) {
    return error(res, 500, 'Something went wrong');
  }
});

app.post('/api/searchrepo', async (req, res) => {
  const query = req.body.query,
        index = req.body.index;
  if (!query || !index) return error(res, 400, 'Param missing');
  try {
    const response = await gitHub.getRepositoryBySearch(query, index);
    return success(res, response);
  }
  catch (e) {
    return error(res, 500, 'Something went wrong');
  }
});

app.get('/api/githubrepo', async (req, res) => {
  const owner = req.query.owner,
        repo = req.query.repo;
  if (owner === undefined || repo === undefined) return error(res, 400, 'Param missing');
  try {
    const data = await gitHub.getRepository(owner, repo);
    if (!data) return success(res, { success: false });
    return success(res, { success: true, data: data });
  }
  catch (e) {
    console.log(e);
    return error(res, 500, 'Something went wrong');
  }
});

app.get('/api/repo', async (req, res) => {
  const id = req.query.id,
        repo = decodeURIComponent(req.query.repo);
  if (!id || !repo) return error(res, 400, 'Param missing');
  try {
    const exists = files.exists('project', 'repos.json', [id]);
    if (!exists) return error(res, 404, 'repos.json not existent');
    const repos = files.json('project', 'repos.json', [id]);
    let result = null;
    for (let i = 0; i < repos.repos.length; i++) {
      const current = repos.repos[i];
      if (current.full_name === repo) {
        result = repos.repos[i];
        break;
      }
    }
    if (result === null) return error(res, 404, 'Repo not existent');
    return success(res, result);
  }
  catch (e) {
    console.log(e);
    return error(res, 500, 'Something went wrong');
  }
});

app.post('/api/repo', async (req, res) => {
  const id = req.body.id,
        data = req.body.data;
  if (!id || !data) return error(res, 400, 'Param missing');
  try {
    const exists = files.exists('project', 'repos.json', [id]);
    if (!exists) return error(res, 404, 'repos.json not existent');
    const repos = files.json('project', 'repos.json', [id]);
    let found = false;
    for (let i = 0; i < repos.repos.length; i++) {
      const current = repos.repos[i];
      if (current.full_name === data.full_name) {
        repos.repos[i] = data;
        found = true;
        break;
      }
    }
    if (found === false) return error(res, 404, 'Repo not existent');
    files.write('project', 'repos.json', repos, [id]);
    if (data.categories !== undefined && data.categories.length > 0) {
      let newCategories;
      if (files.exists('knowledge', 'categories.json')) {
        newCategories = files.json('knowledge', 'categories.json');
      }
      else {
        newCategories = { categories: [] };
      }
      let changed = false;
      data.categories.forEach((category) => {
        if (!newCategories.categories.includes(category)) {
          newCategories.categories.push(category);
          changed = true;
        }
      });
      if (changed) files.write('knowledge', 'categories.json', newCategories);
    }
    if (data.test_frameworks !== undefined && data.test_frameworks.length > 0) {
      let newFrameworks;
      if (files.exists('knowledge', 'testframeworks.json')) {
        newFrameworks = files.json('knowledge', 'testframeworks.json');
      }
      else {
        newFrameworks = { frameworks: [] };
      }
      let changed = false;
      data.test_frameworks.forEach((framework) => {
        if (!newFrameworks.frameworks.includes(framework)) {
          newFrameworks.frameworks.push(framework);
          changed = true;
        }
      });
      if (changed) files.write('knowledge', 'testframeworks.json', newFrameworks);
    }
    if (data.dependencies !== undefined && data.dependencies.length > 0) {
      let newDependencies;
      if (files.exists('knowledge', 'dependencies.json')) {
        newDependencies = files.json('knowledge', 'dependencies.json');
      }
      else {
        newDependencies = { dependencies: [] };
      }
      let changed = false;
      data.dependencies.forEach((dependency) => {
        if (!newDependencies.dependencies.includes(dependency)) {
          newDependencies.dependencies.push(dependency);
          changed = true;
        }
      });
      if (changed) files.write('knowledge', 'dependencies.json', newDependencies);
    }
    return success(res, 'Saved changes');
  }
  catch (e) {
    console.log(e);
    return error(res, 500, 'Something went wrong');
  }
});

app.get('/api/repos', async (req, res) => {
  const id = req.query.id;
  if (!id) return error(res, 400, 'Id missing');
  try {
    const exists = files.exists('project', 'repos.json', [id]);
    if (!exists) return error(res, 404, 'Repos not existent');
    const repos = files.json('project', 'repos.json', [id]);
    return success(res, repos);
  }
  catch (e) {
    return error(res, 500, 'Something went wrong');
  }
});

app.post('/api/repos', async (req, res) => {
  const id = req.body.id,
        data = req.body.data;
  if (!id || !data) return error(res, 400, 'Param missing');
  try {
    files.write('project', 'repos.json', data, [id]);
    const project = files.json('project', 'project.json', [id]);
    if (project.size === data.repos.length) {
      project.has_repos = true;
      files.write('project', 'project.json', project, [id]);
    }
    return success(res, 'Saved changes');
  }
  catch (e) {
    return error(res, 500, 'Something went wrong');
  }
});

app.get('/api/evaluation', async (req, res) => {
  const id = req.query.id;
  if (!id) return error(res, 400, 'Id missing');
  try {
    const exists = files.exists('project', 'evaluation.json', [id]);
    if (!exists) return error(res, 404, 'Evaluation not existent');
    const evaluation = files.json('project', 'evaluation.json', [id]);
    return success(res, evaluation);
  }
  catch (e) {
    return error(res, 500, 'Something went wrong');
  }
});

app.post('/api/evaluation', async (req, res) => {
  const id = req.body.id,
        data = req.body.data;
  if (!id || !data) return error(res, 400, 'Param missing');
  try {
    files.write('project', 'evaluation.json', data, [id]);
    return success(res, 'Saved changes');
  }
  catch (e) {
    return error(res, 500, 'Something went wrong');
  }
});

app.get('/api/exists', async (req, res) => {
  const type = req.query.type,
        file = req.query.file,
        vars = req.query.vars ? req.query.vars.split(',') : undefined;
  if (!type || !file) return error(res, 400, 'Param missing');
  try {
    const exists = files.exists(type, file, vars);
    return success(res, {
      exists: exists
    });
  }
  catch (e) {
    return error(res, 500, 'Something went wrong');
  }
});

app.get('/api/dependencies', async (req, res) => {
  const id = req.query.id;
  if (!id) return error(res, 400, 'Id missing');
  try {
    const dependencies = files.json('project', 'dependencies.json', [id]);
    return success(res, dependencies);
  }
  catch (e) {
    return error(res, 500, 'Something went wrong');
  }
});

app.post('/api/dependencies', async (req, res) => {
  const id = req.body.id,
        data = req.body.data;
  if (!id || !data) return error(res, 400, 'Param missing');
  try {
    files.write('project', 'dependencies.json', data, [id]);
    return success(res, 'Saved changes');
  }
  catch (e) {
    return error(res, 500, 'Something went wrong');
  }
});

app.get('/api/npmpackage', async (req, res) => {
  let name = req.query.name;
  if (!name) return error(res, 400, 'Package name missing');
  name = decodeURIComponent(name);
  try {
    const package = await npm.get(name);
    if (package === null) return success(res, { success: false });
    return success(res, {
      success: true, 
      data: package
    });
  }
  catch (e) {
    return error(res, 500, 'Something went wrong');
  }
});

app.post('/api/checknpm', async (req, res) => {
  const data = req.body.data;
  if (!data) return error(res, 400, 'Data param missing');
  try {
    const package_json = await gitHub.getFile(data.owner.login, data.name, 'package.json');
    if (package_json === null) {
      const response = await gitHub.searchFileInRepo(data.full_name, 'package', 'json');
      if (response.data.total_count > 0) {
        data.is_npm = true;
        if (response.data.total_count > 1) {
          data.multiple_package_json = true;
          console.warn(`Warning: Multiple occurences of package.json found in ${data.full_name}`);
        }
        const package_json2 = await gitHub.getFile(data.owner.login, data.name, response.data.items[0].path),
              decoded2 = (package_json2.data.encoding !== 'utf-8') ? Buffer.from(package_json2.data.content, package_json2.data.encoding).toString('utf-8').replace(/\,(?=\s*?[\}\]])/g, '') : package_json2.data.content;
        data.package_json = JSON.parse(decoded2);
      }
      else {
        data.is_npm = false;
      }
    }
    else {
      const decoded = (package_json.data.encoding !== 'utf-8') ? Buffer.from(package_json.data.content, package_json.data.encoding).toString('utf-8').replace(/\,(?=\s*?[\}\]])/g, '') : package_json.data.content;
      data.is_npm = true;
      data.package_json = JSON.parse(decoded);
    }
    return success(res, data);
  }
  catch (e) {
    console.log(e);
    data.is_npm = false;
    return success(res, data);
  }
});

app.get('/api/npmall', async (req, res) => {
  const includeContent = req.query.includeContent;
  try {
    const exists = files.exists('knowledge', 'npmall.json');
    if (!exists) {
      return success(res, { fetched: false });
    }
    const npmall = files.raw('knowledge', 'npmall.json');
    const minified = npmall.includes('"names":');
    if (includeContent) {
      return success(res, { fetched: true, minified: minified, data: JSON.parse(npmall) });
    }
    else {
      return success(res, { fetched: true, minified: minified });
    }
  }
  catch (e) {
    return error(res, 500, 'Something went wrong');
  }
});

app.post('/api/npmall', async (req, res) => {
  try {
    fs.writeFileSync(files.path('knowledge', 'npmall.json'), '');
    const response = await npm.getAllDocs(files.path('knowledge', 'npmall.json'));
    if (response) return success(res, { success: true });
    return error(res, 500, 'Error getting all packages');
  }
  catch (e) {
    console.log(e);
    return error(res, 500, 'Something went wrong');
  }
});

app.post('/api/npmminify', async (req, res) => {
  try {
    const npmall = files.json('knowledge', 'npmall.json');
    const minified = {
      total: npmall.total_rows,
      names: []
    };
    for (let i = 0; i < npmall.rows.length; i++) {
      minified.names.push(npmall.rows[i].id);
    }
    files.writeMin('knowledge', 'npmall.min.json', minified);
    return success(res, { success: true });
  }
  catch (e) {
    console.log(e);
    return error(res, 500, 'Something went wrong');
  }
});

app.post('/api/countcommits', async (req, res) => {
  const data = req.body.data;
  if (!data) return error(res, 400, 'Data param missing');
  try {
    const response = await gitHub.getTotalCommits(data.name, data.owner.login, data.default_branch);
    data.total_commits = response.total;
    return success(res, data);
  }
  catch (e) {
    console.log(e);
    return error(res, 500, 'Error getting results');
  }
});

app.post('/api/countprs', async (req, res) => {
  const data = req.body.data;
  if (!data) return error(res, 400, 'Data param missing');
  try {
    const response = await gitHub.getTotalPRs(data.full_name);
    data.total_prs = response.total;
    if (response.invalid === true) console.log('Warning: PR total invalid');
    return success(res, data);
  }
  catch (e) {
    console.log(e);
    return error(res, 500, 'Error getting results');
  }
});

app.post('/api/downloadrepo', async (req, res) => {
  const id = req.body.id,
        repo = req.body.repo;
  if (!id || !repo) return error(res, 400, 'Param missing');
  try {
    const formattedName = files.safeFormat(repo);
    const response = await gitHub.downloadGitRepo(repo, files.path('files', '', [id, formattedName]));
    if (response === false) return error(res, 500, 'Error on downloading repo');
    return success(res, {
      localFolder: formattedName
    });
  }
  catch (e) {
    console.log(e);
    return error(res, 500, 'Something went wrong');
  }
});

app.post('/api/checktests', async (req, res) => {
  const id = req.body.id,
        repo = req.body.repo;
  if (!id || !repo) return error(res, 400, 'Param missing');
  try {
    const result = {
      has_tests: false,
      has_performance_tests: false
    };
    const formattedName = files.safeFormat(repo);
    const testResponse = files.hasTests(files.path('files', '', [id, formattedName]));
    if (testResponse !== false) {
      result.has_tests = true;
      result.test_occurences = testResponse;
    }
    const perfTestResponse = files.hasPerformanceTests(files.path('files', '', [id, formattedName]));
    if (perfTestResponse !== false) {
      result.has_performance_tests = true;
      result.performance_test_occurences = perfTestResponse;
    }
    return success(res, result);
  }
  catch (e) {
    console.log(e);
    return error(res, 500, 'Something went wrong');
  }
});

app.get('/api/npmtotal', async (req, res) => {
  try {
    const total = await npm.getTotal();
    return success(res, { total: total });
  }
  catch (e) {
    return error(res, 500, 'Something went wrong');
  }
});

app.get('/api/metrics', async (req, res) => {
  const id = req.query.id;
  let repo = req.query.repo;
  if (!id) return error(res, 400, 'Param missing');
  try {
    const exists = files.exists('project', 'metrics.json', [id]);
    let result;
    if (repo) repo = decodeURIComponent(repo);
    if (exists) {
      const data = files.json('project', 'metrics.json', [id]);
      if (repo) {
        result = data.repos[repo] || { source: {}, test: {} };
      }
      else {
        result = data;
      }
    }
    else {
      if (repo) {
        result = {};
      }
      else {
        result = { repos: {} };
      }
    }
    return success(res, result);
  }
  catch (e) {
    return error(res, 500, 'Something went wrong');
  }
});

app.post('/api/metrics', async (req, res) => {
  const id = req.body.id,
        repo = req.body.repo,
        data = req.body.data;
  if (!id || !repo || !data) return error(res, 400, 'Param missing');
  try {
    const exists = files.exists('project', 'metrics.json', [id]);
    let content;
    if (exists) {
      content = files.json('project', 'metrics.json', [id]);
    }
    else {
      content = { repos: {} };
    }
    if (data.test.notcM !== undefined && data.test.notcM instanceof Array) {
      if (data.test.notcM.length === 0) {
        delete data.test.notcM;
      }
      else {
        const arr = data.test.notcM.map(value => Number(value));
        data.test.notcM = metrics.valuesFromArr(arr, 'notcM');
      }
    }
    content.repos[repo] = data;
    files.write('project', 'metrics.json', content, [id], true);
    return success(res, data);
  }
  catch (e) {
    return error(res, 500, 'Something went wrong');
  }
});

app.post('/api/calcmetrics', async (req, res) => {
  const id = req.body.id,
        repo = req.body.repo;
  if (!id || !repo) return error(res, 400, 'Param missing');
  try {
    const formattedName = files.safeFormat(repo);
    const report = metrics.complexityRepo(files.path('files', '', [id, formattedName]));
    return success(res, report);
  }
  catch (e) {
    console.log(e);
    return error(res, 500, 'Something went wrong');
  }
});

app.post('/api/calcperfmetrics', async (req, res) => {
  const id = req.body.id,
        repo = req.body.repo,
        paths = req.body.paths;
  if (!id || !repo || !paths) return error(res, 400, 'Param missing');
  try {
    const report = metrics.complexityRepoPerf(paths);
    return success(res, report);
  }
  catch (e) {
    console.log(e);
    return error(res, 500, 'Something went wrong');
  }
});

app.post('/api/calccorrelations', async (req, res) => {
  const data = req.body.data;
  if (!data) return error(res, 400, 'Param missing');
  try {
    const correlations = correlations.repo(data);
    return success(res, correlations);
  }
  catch (e) {
    console.log(e);
    return error(res, 500, 'Something went wrong');
  }
});

app.get('/api/categories', async (req, res) => {
  try {
    const exists = files.exists('knowledge', 'categories.json');
    if (!exists) {
      return success(res, { categories: [] });
    }
    const categories = files.json('knowledge', 'categories.json');
    return success(res, categories);
  }
  catch (e) {
    return error(res, 500, 'Something went wrong');
  }
});

app.get('/api/frameworks', async (req, res) => {
  try {
    const exists = files.exists('knowledge', 'testframeworks.json');
    if (!exists) {
      return success(res, { frameworks: [] });
    }
    const frameworks = files.json('knowledge', 'testframeworks.json');
    return success(res, frameworks);
  }
  catch (e) {
    return error(res, 500, 'Something went wrong');
  }
});

app.get('/api/knowndependencies', async (req, res) => {
  try {
    const exists = files.exists('knowledge', 'dependencies.json');
    if (!exists) {
      return success(res, { dependencies: [] });
    }
    const dependencies = files.json('knowledge', 'dependencies.json');
    return success(res, dependencies);
  }
  catch (e) {
    return error(res, 500, 'Something went wrong');
  }
});

app.get('/api/metricdefs', async (req, res) => {
  try {
    const exists = files.exists('knowledge', 'metrics.json');
    if (!exists) {
      return success(res, { metrics: {} });
    }
    const metrics = files.json('knowledge', 'metrics.json');
    return success(res, metrics);
  }
  catch (e) {
    return error(res, 500, 'Something went wrong');
  }
});

app.post('/api/calccoverage', async (req, res) => {
  const id = req.body.id,
        repo = req.body.repo;
  if (!id || !repo) return error(res, 400, 'Param missing');
  try {
    const formattedName = files.safeFormat(repo);
    const exists = files.exists('files', 'coverage-summary.json', [id, formattedName]);
    if (!exists) return error(res, 404, 'Coverage report does not exist, create it first')
    const report = files.json('files', 'coverage-summary.json', [id, formattedName]);
    const coverage = metrics.coverageFromSummary(report);
    return success(res, coverage);
  }
  catch (e) {
    console.log(e);
    return error(res, 500, 'Something went wrong');
  }
});

app.post('/api/clean', async (req, res) => {
  const id = req.body.id,
        repo = req.body.repo;
  if (!id || !repo) return error(res, 400, 'Param missing');
  try {
    const formattedName = files.safeFormat(repo);
    files.clean(files.path('files', '', [id, formattedName]));
    return success(res, 'Cleaned files');
  }
  catch (e) {
    console.log(e);
    return error(res, 500, 'Something went wrong');
  }
});

app.listen(config.port, () => {
  console.log(`API listening on port ${config.port}`);
});