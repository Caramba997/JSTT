const express = require('express');
const config = require('./config.js');
const root = require('app-root-path');
const fs = require('fs');
const bodyParser = require('body-parser');
const { GitHub } = require('../lib/github.js');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json({limit: '50mb'}));

const gitHub = new GitHub();

function success(res, data) {
  return res.send({
    ok: true,
    data: data
  });
}

function error(res, code, msg) {
  console.error(msg);
  return res.status(code).send({
    ok: false,
    msg: msg
  });
}

app.get(/^\/ui\/.*/, (req, res) => {
  const file = req.originalUrl.split('/ui/')[1].split('?')[0].split('#')[0],
        ending = file.match(/\.[^\.]+$/g),
        type = ending ? ending[0].replace('.', '') : 'html',
        path = `${root}/ui/${file.includes('/') ? '' : `${type}/`}${file}${type === 'html' ? '.html' : ''}`;
  res.sendFile(path);
});

app.get('/api/dir', (req, res) => {
  const path = `./${req.query.path}`;
  if (path === undefined) return error(res, 400, 'Path query param missing');
  console.log(`GET /dir -> ${path}`);
  try {
    const result = {
            path: path,
            files: []
          };
    fs.readdirSync(path).forEach(file => {
      result.files.push(file);
    });
    return success(res, result);
  }
  catch (e) {
    return error(res, 404, 'Directory not found');
  }
});

app.get('/api/results', (req, res) => {
  const path = `./results/${req.query.path}`;
  if (!path) return error(res, 400, 'Path query param missing');
  console.log(`GET /results -> ${path}`);
  try {
    const data = fs.readFileSync(path),
          json = JSON.parse(data);
    return success(res, json);
  }
  catch (e) {
    return error(res, 404, `File not found for path ${path}`);
  }
});

app.post('/api/results', (req, res) => {
  const path = `./results/${req.body.path}`,
        data = req.body.data;
  if (!path) return error(res, 400, 'Path param missing');
  if (!data) return error(res, 400, 'Data param missing');
  console.log(`POST /results -> ${path}`);
  try {
    fs.writeFileSync(path, JSON.stringify(data));
    return success(res, 'Successfully saved file');
  }
  catch (e) {
    return error(res, 404, `File not found for path ${path}`);
  }
});

app.post('/api/checknpm', async (req, res) => {
  // TODO Einzelne vom Frontend ansteuern, is_npm stimmt aktuell nicht
  const data = req.body.data;
  if (!data) return error(res, 400, 'Data param missing');
  console.log(`POST /checknpm`);
  try {
    data.stats.npm = 0;
    for (let i = 0; i < data.repos.length; i++) {
      const repo = data.repos[i];
      console.log(`${i + 1}/${data.repos.length} Checking ${repo.full_name}`);
      const response = await gitHub.getFileInRepo(repo.full_name, 'package.json');
      if (response.total_count > 0) {
        repo.is_npm = true;
        repo.package_json_url = response.items[0].url;
        data.stats.npm++;
      }
      else {
        repo.is_npm = false;
      }
    }
    return success(res, data);
  }
  catch (e) {
    console.log(e);
    return error(res, 500, 'Error getting results');
  }
});

app.listen(config.port, () => {
  console.log(`App listening on port ${config.port}`);
});