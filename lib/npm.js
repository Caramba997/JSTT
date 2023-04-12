class NPM {
  constructor() {
    const axios = require('axios');
    this.axios = axios.create({
      baseURL: 'https://registry.npmjs.org/-/v1/'
    });
    this.searchQuery = 'search?text=not:insecure&size=1&from={{from}}'; //Use not:insecure because text can not be empty
  }

  async getTotal() {
    const response = await this.axios.get(this.searchQuery.replace('{{from}}', 0));
    if (response.status !== 200) throw 'Error querying NPM registry';
    return response.data.total;
  }
}

module.exports = { NPM };