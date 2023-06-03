class LibrariesIO {
  constructor() {
    const dotenv = require('dotenv');
    dotenv.config();
    const axios = require('axios');
    this.axios = axios.create({
      baseURL: 'https://libraries.io/api/'
    });
    this.key = process.env.LIO_KEY;
  }

  async searchPopular(term, pages) {
    const all = [];
    let current = 1;
    do {
      const response = await this.axios.get('search', {
        params: {
          q: term,
          sort: 'dependents_count',
          order: 'desc',
          api_key: this.key,
          languages: 'javascript,typescript',
          platforms: 'npm',
          page: current,
          per_page: 30
        }
      });
      response.data = 'XXX';
      current++;
      all.push(...response.data);
    } while (current <= pages);
    return all;
  }

  async getTotal(languages, platforms) {
    const response = await this.axios.get('search', {
      params: {
        q: '',
        api_key: this.key,
        languages: languages,
        platforms: platforms,
        page: 1,
        per_page: 1
      }
    });
    return response.headers.total;
  }

  async getDependents(module, pages) {
    const all = [];
    let current = 1;
    do {
      const response = await this.axios.get(`npm/${module}/dependents`, {
        params: {
          api_key: this.key,
          page: current
        }
      });
      current++;
      all.push(...response.data);
    } while (current <= pages);
    return all;
  }
}

module.exports = { LibrariesIO };