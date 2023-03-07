const { GitHub } = require('../lib/github.js');
const fs = require('fs');

const today = new Date(),
      day = today.getUTCDate(),
      month = today.getUTCMonth() + 1;

const settings = {
  filename: `github_js_repo_count${month}-${day}_stars5.json`,
  startDateFormat: '20YY-MM-DD',
  endDateFormat: '20YY-MM-DD',
  startYear: 7,
  endYear: 23,
  query: 'language:{{language}}+created:{{dates}}+stars:>=5',
  languages: ['javascript', 'typescript']
};

const gitHub = new GitHub();

(async () => {
  console.log(`Start counting GitHub repositories`);
  const startTime = Date.now();
  const result = {
    query: settings.query,
    languages: settings.languages,
    valid: true,
    total: 0,
    results: []
  }
  for (let i = 0; i < settings.languages.length; i++) {
    const language = settings.languages[i];
    for (let year = settings.startYear; year <= settings.endYear; year++) {
      let sYear = '' + year;
      if (sYear.length === 1) sYear = '0' + sYear;
      let dates = `${settings.startDateFormat.replace('YY', sYear).replace('MM', '01').replace('DD', '01')}..${settings.endDateFormat.replace('YY', sYear).replace('MM', '12').replace('DD', '31')}`;
      let query = settings.query.replace('{{language}}', language).replace('{{dates}}', dates);
      let response = await gitHub.getTotalRepositories(query);
      console.log(`${language}-20${sYear}: Found a total of ${response.total} repositories`);
      if (response.invalid) {
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
          query = settings.query.replace('{{language}}', language).replace('{{dates}}', dates);
          response = await gitHub.getTotalRepositories(query);
          console.log(`-> ${language}-20${sYear}-part${i}: Found a total of ${response.total} repositories`);
          result.results.push({
            timeframe: dates,
            language: language,
            valid: !response.invalid,
            total: response.total
          });
          result.total += response.total;
        }
      }
      else {
        result.results.push({
          timeframe: dates,
          language: language,
          valid: !response.invalid,
          total: response.total
        });
        result.total += response.total;
      }
    }
  }
  fs.writeFileSync(`${process.cwd()}/results/counts/${settings.filename}`, JSON.stringify(result));
  console.log(`${result.valid ? '[valid]' : '[invalid]'} Found a total of ${result.total} repositories`);
  console.log(`Outputted result to file /results/counts/${settings.filename}`);
  console.log(`Finished counting GitHub repositories in ${(Date.now() - startTime) / 1000}s`);
})();