class Random {
  constructor() {
    const axios = require('axios');
    this.axios = axios.create({
      baseURL: 'https://www.random.org/'
    });
  }

  async get(total, min, max) {
    const response = await this.axios.get('integer-sets/', {
      params: {
        sets: 1,
        num: total,
        min: min,
        max: max,
        commas: 'on',
        sort: 'on',
        order: 'index',
        format: 'plain',
        rnd: 'new'
      }
    });
    return response.data.replace(/\s|\n|\\n/gm, '');
  }

  async getUnordered(total, min, max) {
    const response = await this.axios.get('integer-sets/', {
      params: {
        sets: 1,
        num: total,
        min: min,
        max: max,
        commas: 'on',
        sort: 'off',
        order: 'index',
        format: 'plain',
        rnd: 'new'
      }
    });
    return response.data.replace(/\s|\n|\\n/gm, '');
  }

  // Returns remaining bytes
  async quota() {
    const response = await this.axios.get('quota/', {
      params: {
        format: 'plain'
      }
    });
    return response.data;
  }
}

module.exports = { Random };