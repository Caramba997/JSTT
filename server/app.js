const express = require('express');
const config = require('./config.js');
const root = require('app-root-path');
const fs = require('fs');
const bodyParser = require('body-parser');
const { GitHub } = require('../lib/github.js');
const { Files } = require('../lib/files.js');

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
const files = new Files();

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
    files.write('project', '', project, [id]);
    return success(res, project);
  }
  catch (e) {
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

app.get('/api/repos', async (req, res) => {
  const id = req.query.id;
  if (!id) return error(res, 400, 'Id missing');
  try {
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
    return success(res, 'Saved changes');
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
            decoded = (package_json.data.encoding !== 'utf-8') ? Buffer.from(package_json.data.content, package_json.data.encoding).toString('utf-8') : package_json.data.content;
      data.package_json = JSON.parse(decoded);
      if (data.package_json_url) delete data.package_json_url;
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

app.listen(config.port, () => {
  console.log(`API listening on port ${config.port}`);
});