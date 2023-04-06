const { GitHub } = require('../lib/github.js');
const fs = require('fs');

const settings = {
  keywords: ['refactor', 'testability'], //['benchmark'], //, ['performance'], 'performance AND testability', 'performance AND refactor'],
  filename: 'random-github_1678208516419.json'
};

const gitHub = new GitHub();

(async () => {
  console.log(`Start fetching commits for repositories defined in ${settings.filename}`);
  const startTime = Date.now();
  const path = `${process.cwd()}/results/repos/${settings.filename}`;
  const data = fs.readFileSync(path, 'utf8');
  const json = JSON.parse(data).repos;
  const filenames = [];
  for (let i = 0; i < json.length; i++) {
    // if (i >= 5) break;
    const filename = await getCommits(json[i].html_url);
    filenames.push(filename);
  }
  fs.writeFileSync(`${process.cwd()}/results/commit_meta/filenames/${settings.filename}`, JSON.stringify(filenames));
  console.log(`Finished fetching commits in ${(Date.now() - startTime) / 1000}s`);
})();

async function getCommits(url) {
  console.log(`Looking for commits in repository ${url.replace('https://github.com/', '')}...`);
  const prs = await gitHub.getCommits(url, settings.keywords);
  const urlParts = url.split('/');
  const filename = `${urlParts[urlParts.length - 2]}_${urlParts[urlParts.length - 1]}_${Date.now()}.json`;
  const path = `${process.cwd()}/results/commit_meta/${filename}`.replaceAll('\\', '/');
  fs.writeFileSync(path, JSON.stringify(prs));
  console.log(`Successfully outputted ${prs.length} commits to ${path}`);
  return filename;
}