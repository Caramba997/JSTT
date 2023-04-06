const { GitHub } = require('../lib/github.js');
const fs = require('fs');

const settings = {
  keywords: ['refactor'], //['benchmark'], //, ['performance'], 'performance AND testability', 'performance AND refactor'],
  filename: 'random-github_1678208516419.json'
};

const gitHub = new GitHub();

(async () => {
  console.log(`Start fetching PRs for repositories defined in ${settings.filename}`);
  const startTime = Date.now();
  const path = `${process.cwd()}/results/repos/${settings.filename}`;
  const data = fs.readFileSync(path, 'utf8');
  // const json = JSON.parse(data);
  const json = JSON.parse(data).repos;
  const filenames = [];
  for (let i = 0; i < json.length; i++) {
    // if (i >= 5) break;
    // const filename = await getPRs(json[i].repository_url);
    const filename = await getPRs(json[i].html_url);
    filenames.push(filename);
  }
  fs.writeFileSync(`${process.cwd()}/results/pr_meta/filenames/${settings.filename}`, JSON.stringify(filenames));
  console.log(`Finished fetching PRs in ${(Date.now() - startTime) / 1000}s`);
})();

async function getPRs(url) {
  console.log(`Looking for PRs in repository ${url.replace('https://github.com/', '')}...`);
  const prs = await gitHub.getPullRequests(url, settings.keywords);
  const urlParts = url.split('/');
  const filename = `${urlParts[urlParts.length - 2]}_${urlParts[urlParts.length - 1]}_${Date.now()}.json`;
  const path = `${process.cwd()}/results/pr_meta/${filename}`.replaceAll('\\', '/');
  fs.writeFileSync(path, JSON.stringify(prs));
  console.log(`Successfully outputted ${prs.length} PRs to ${path}`);
  return filename;
}