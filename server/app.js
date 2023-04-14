const express = require('express');
const config = require('./config.js');
const root = require('app-root-path');
const fs = require('fs');
const bodyParser = require('body-parser');
const { GitHub } = require('../lib/github.js');
const { Random } = require('../lib/random.js');
const { Files } = require('../lib/files.js');
const { NPM } = require('../lib/npm.js');

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
      project.has_counts = true;
      files.write('project', 'project.json', project, [id]);
    }
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

app.post('/api/checknpm', async (req, res) => {
  const data = req.body.data;
  if (!data) return error(res, 400, 'Data param missing');
  try {
    const response = await gitHub.getFileInRepo(data.full_name, 'package', 'json');
    if (response.data.total_count > 0) {
      if (response.data.total_count > 1) {
        data.multiple_package_json = true;
        console.warn(`Warning: Multiple occurences of package.json found in ${data.full_name}`);
      }
      data.is_npm = true;
      const package_json = await gitHub.getFile(data.name, data.owner.login, response.data.items[0].path),
            decoded = (package_json.data.encoding !== 'utf-8') ? Buffer.from(package_json.data.content, package_json.data.encoding).toString('utf-8').replace(/\,(?=\s*?[\}\]])/g, '') : package_json.data.content;
      data.package_json = JSON.parse(decoded);
    }
    else {
      data.is_npm = false;
    }
    return success(res, data);
  }
  catch (e) {
    console.log(e);
    return error(res, 500, 'Error getting results');
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
    if (includeContent) {
      return success(res, { fetched: true, data: npmall });
    }
    else {
      return success(res, { fetched: true });
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
    const formattedName = files.safeFormat(repo);
    const result = files.hasTests(files.path('files', '', [id, formattedName]));
    if (result === false) return success(res, { has_tests: false });
    return success(res, {
      has_tests: true, 
      test_occurences: result
    });
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

app.listen(config.port, () => {
  console.log(`API listening on port ${config.port}`);
});