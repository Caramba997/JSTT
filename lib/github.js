class GitHub {
  constructor() {
    const dotenv = require('dotenv');
    dotenv.config();
    this.key = process.env.GITHUB_KEY;
    this.maxPR = -1;
    const { Octokit } = require('octokit');
    this.octokit = new Octokit({
      auth: this.key,
      log: {
        debug: () => {},
        info: console.info,
        warn: console.warn,
        error: console.error
      },
      throttle: {
        onRateLimit: (retryAfter, options, octokit) => {
          octokit.log.warn(
            `Request quota exhausted for request ${options.method} ${options.url}`
          );
      
          if (options.request.retryCount <= 3) {
            // Retries 3 times
            octokit.log.info(`Retrying after ${retryAfter} seconds!`);
            return true;
          }
        },
        onSecondaryRateLimit: async (retryAfter, options, octokit) => {
          octokit.log.warn(
            `SecondaryRateLimit detected for request ${options.method} ${options.url}`
          );
      
          if (options.request.retryCount < 2) {
            // Retries 3 times
            octokit.log.info(`Retrying after ${retryAfter} seconds!`);
            return true;
          }
          else if (options.request.retryCount < 5) {
            octokit.log.info(`Retrying after ${retryAfter} + 10 seconds!`);
            function sleep(ms) {
              return new Promise((resolve) => {
                setTimeout(resolve, ms);
              });
            }
            await sleep(10000);
            return true;
          }
          else if (options.request.retryCount === 5) {
            octokit.log.info(`Retrying after ${retryAfter} + 30 seconds!`);
            function sleep(ms) {
              return new Promise((resolve) => {
                setTimeout(resolve, ms);
              });
            }
            await sleep(30000);
            return true;
          }
        },
      }
    });
  }

  async getRateLimit() {
    const limit = await this.octokit.request('GET /rate_limit', {});
    return limit;
  }

  async getRepository(url) {
    const response = await this.octokit.request('GET /search/repositories', {
      q: `repo:${url.replace('https://github.com/', '')}`
    });
    if (response.data.total_count === 0) return false;
    return response.data.items;
  }

  async getRepositoryBySearch(query, number) {
    const response = await this.octokit.request('GET /search/repositories', {
      q: query,
      per_page: 1,
      page: number
    });
    return response.data;
  }

  async getCommits(url, keywords) {
    const keywordString = keywords.join(' OR ');
    const query = `${keywordString} repo:${url.replace('https://github.com/', '')} merge:true`;
    const all = [];
    const response = await this.octokit.request('GET /search/commits', {
      q: query,
      per_page: 100
    });
    if (response.data.total_count === 0) return [];
    all.push(...response.data.items);
    if (response.data.total_count > 100) {
      let processed = 100;
      let page = 2;
      do {
        console.log(`Processing page ${page} of ${response.data.total_count} commits`);
        const subResponse = await this.octokit.request('GET /search/commits', {
          q: query,
          per_page: 100,
          page: page
        });
        all.push(...subResponse.data.items);
        processed += subResponse.data.items.length;
        page++;
      } while (processed < response.data.total_count && (this.maxPR === -1 || processed < this.maxPR));
    }
    return all;
  }

  async getTotalCommits(repo, owner, branch) {
    const response = await this.octokit.request('GET /repos/{owner}/{repo}/commits', {
      owner: owner,
      repo: repo,
      per_page: 1,
      page: 1,
      sha: branch,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
    const link = response.headers.link,
          total = link.match(/\d+(?=&sha=[^<]+>; rel="last")/)[0];

    return {
      total: parseInt(total)
    };
  }

  async getTotalPRs(repo) {
    const response = await this.octokit.request('GET /search/issues', {
      q: `+type:pr+repo:${repo}`,
      per_page: 1
    });
    
    return {
      total: response.data.total_count,
      invalid: response.data.incomplete_results
    };
  }

  async getTotalRepositories(query) {
    const response = await this.octokit.request('GET /search/repositories', {
      q: query,
      per_page: 1
    });

    return {
      total: response.data.total_count,
      invalid: response.data.incomplete_results
    };
  }

  async getPullRequests(url, keywords) {
    const keywordString = keywords.join(' OR ');
    const query = `${keywordString} repo:${url.replace('https://github.com/', '')} is:pull-request in:title,body is:merged`;
    const all = [];
    const response = await this.octokit.request('GET /search/issues', {
      q: query,
      per_page: 100
    });
    if (response.data.total_count === 0) return [];
    all.push(...response.data.items);
    if (response.data.total_count > 100) {
      let processed = 100;
      let page = 2;
      do {
        console.log(`Processing page ${page} of ${response.data.total_count} PRs`);
        const subResponse = await this.octokit.request('GET /search/issues', {
          q: query,
          per_page: 100,
          page: page
        });
        all.push(...subResponse.data.items);
        processed += subResponse.data.items.length;
        page++;
      } while (processed < response.data.total_count && (this.maxPR === -1 || processed < this.maxPR));
    }
    return all;
  }

  async getPullRequestFiles(url, pr_number) {
    const urlParts = url.split('/');
    const response = await this.octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}/files', {
      owner: urlParts[urlParts.length - 2],
      repo: urlParts[urlParts.length - 1],
      pull_number: pr_number,
      per_page: 100
    });
    return response;
  }

  async getFileInRepo(repo, filename, language) {
    const response = await this.octokit.request('GET /search/code', {
      q: `dependencies+repo:${repo}+filename:${filename}+language:${language}`
    });
    return response;
  }

  async getFile(repo, owner, path) {
    const response = await this.octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
      owner: owner,
      repo: repo,
      path: path,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    })
    return response;
  }

  createFullQuery(query) {
    const base = 'language:{{language}}+created:{{dates}}';
    return query ? `${base}+${query}` : base;
  }
}

module.exports = { GitHub };