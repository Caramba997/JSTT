const { GitHub } = require('../lib/github.js');
const date =  require('date-and-time');
const fs = require('fs');

const settings = {
  random_file: 'randoms_384-1to593760_1678194043338.txt',
  count_file: 'github_js_repo_count3-7_stars5.json',
  input_date_format: 'YYYY-MM-DD',
  date_format: 'YYYY-MM-DDTHH:mm:ss',
  gitHubLimit: 1000
};

const gitHub = new GitHub();

(async () => {
  console.log(`Start fetching repositories in frame defined in ${settings.count_file} from random numbers defined in ${settings.random_file}`);
  const startTime = Date.now();
  const random_path = `${process.cwd()}/results/randoms/${settings.random_file}`;
  console.log(random_path);
  const random_data = fs.readFileSync(random_path, 'utf8');
  const randoms = random_data.split(',');
  const count_path = `${process.cwd()}/results/counts/${settings.count_file}`;
  const count_data = fs.readFileSync(count_path, 'utf8');
  const count_json = JSON.parse(count_data);
  const counts = [];
  let total = 0;
  for (let i = 0; i < count_json.results.length; i++) {
    const current = count_json.results[i],
          dates = current.timeframe.split('..');
    counts.push({
      start_date: date.parse(dates[0], settings.input_date_format, true),
      end_date: date.addMilliseconds(date.addDays(date.parse(dates[1], settings.input_date_format, true), 1), -1),
      start_count: total + 1,
      end_count: total + current.total,
      range_count: current.total,
      language: current.language
    });
    total += current.total;
  }
  const result = {
    random_file: settings.random_file,
    randoms: randoms,
    count_file: settings.count_file,
    query: count_json.query,
    languages: count_json.languages,
    counts: counts,
    repos: [],
    errors: []
  };
  for (let i = 0; i < randoms.length; i++) {
    // if (i > 10) break;
    const random = randoms[i];
    for (let k = 0; k < counts.length; k++) {
      const current = counts[k];
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
                  query = count_json.query.replace('{{language}}', count_obj.language).replace('{{dates}}', dates),
                  response = await gitHub.getTotalRepositories(query),
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
            counts.splice(counts.indexOf(count_obj), 1, firstCount, secondCount);
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
              query = count_json.query.replace('{{language}}', count_obj.language).replace('{{dates}}', dates);
        try {
          const response = await gitHub.getRepositoryBySearch(query, random - count_obj.start_count + 1);
          if (response.items.length !== 1) {
            console.error(`[Error] Repository not found for query "${query}"`);
            result.errors.push({
              query: query,
              response_total: response.total_count,
              response: response,
              count: count_obj
            });
          }
          else {
            console.log(`#${i + 1}: ${random} -> ${response.items[0].full_name}`);
            result.repos.push(response.items[0]);
          }
        }
        catch (e) {
          console.error(`[Error] Problem with GitHub API for query "${query}"`);
          result.errors.push({
            query: query,
            response: e,
            count: count_obj
          });
        }
        break;
      }
    }
  }
  const output_file = `random-github_${Date.now()}.json`;
  fs.writeFileSync(`${process.cwd()}/results/repos/${output_file}`, JSON.stringify(result));
  console.log(`Finished fetching repositories in ${(Date.now() - startTime) / 1000}s and outputted them to ${output_file}`);
})();