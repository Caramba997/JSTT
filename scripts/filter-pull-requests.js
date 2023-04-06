const { GitHub } = require('../lib/github.js');
const fs = require('fs');

const settings = {
  filename: 'random-github_1678208516419.json'
};

const gitHub = new GitHub();

(async () => {
  console.log(`Start filtering repositories defined in ${settings.filename}`);
  const startTime = Date.now();
  const path = `${process.cwd()}/results/pr_meta/filenames/${settings.filename}`;
  const data = fs.readFileSync(path, 'utf8');
  const json = JSON.parse(data);
  let total = 0;
  for (let i = 0; i < json.length; i++) {
    console.log(`Start filtering PRs defined in ${json[i]}`);
    const subPath = `${process.cwd()}/results/pr_meta/${json[i]}`;
    const subData = fs.readFileSync(subPath, 'utf8');
    const subJson = JSON.parse(subData);
    const filtered = [];
    for (let k = 0; k < subJson.length; k++) {
      let files = await gitHub.getPullRequestFiles(subJson[k].repository_url, subJson[k].number);
      files = files.data;
      for (let m = 0; m < files.length; m++) {
        if (['.js', '.ts'].some(element => files[m].filename.includes(element)) && ['test', 'bench', 'spec'].some(element => files[m].contents_url.includes(element))) {
          const newJson = JSON.parse(JSON.stringify(subJson[k]));
          newJson.files = files;
          filtered.push(newJson);
          total++;
          break;
        }
      }
    }
    fs.writeFileSync(`${process.cwd()}/results/pr_filtered/${json[i]}`, JSON.stringify(filtered));
    console.log(`Finished filtering with ${filtered.length}/${subJson.length} PRs remaining`);
  }
  console.log(`Finished filtering PRs in ${(Date.now() - startTime) / 1000}s, ${total} PRs remaining`);
})();