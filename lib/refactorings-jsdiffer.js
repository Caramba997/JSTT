const axios = require('axios');

class RefactoringsJSDiffer {
  constructor() {
    this.javaServerUrl = 'http://localhost:8080';
    this.routes = {
      refactorings: '/api/refactorings'
    };
  }
  
  async findRefactorings(owner, repo, commits) {
    const response = await axios.post(this.javaServerUrl + this.routes.refactorings, {
      owner: owner,
      repo: repo,
      commits: commits
    }, {
      headers: {'Content-Type': 'application/json'}
    });
    return response.data;
  }

}

module.exports = { RefactoringsJSDiffer };