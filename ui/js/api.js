class API {
  constructor() {
    this.routes = {
      checknpm: '/api/checknpm',
      project: '/api/project',
      projects: '/api/projects',
      randoms: '/api/randoms',
      counts: '/api/counts',
      repo: '/api/repo',
      repos: '/api/repos',
      dependencies: '/api/dependencies',
      countcommits: '/api/countcommits',
      countprs: '/api/countprs',
      totalrepos: '/api/totalrepos',
      searchrepo: '/api/searchrepo',
      exists: '/api/exists',
      downloadrepo: '/api/downloadrepo',
      checktests: '/api/checktests',
      npmtotal: '/api/npmtotal',
      npmall: '/api/npmall',
      npmminify: '/api/npmminify',
      npmpackage: '/api/npmpackage',
      githubrepo: '/api/githubrepo',
      metrics: '/api/metrics',
      calcmetrics: '/api/calcmetrics',
      categories: '/api/categories',
      frameworks: '/api/frameworks',
      knowndependencies: '/api/knowndependencies',
      metricdefs: '/api/metricdefs',
      calccoverage: '/api/calccoverage',
      clean: '/api/clean',
      calcperfmetrics: '/api/calcperfmetrics',
      evaluation: '/api/evaluation',
      calccorrelations: '/api/calccorrelations',
      commits: '/api/commits',
      prs: '/api/prs',
      findCommits: '/api/findCommits',
      findPrs: '/api/findPrs',
      refactorings: '/api/refactorings',
      findRefactorings: '/api/findRefactorings',
      findRefactoringsJsDiffer: '/api/findRefactoringsJsDiffer',
      refactoringTypes: '/api/refactoringTypes'
    };
  }

  /**
   * Do a GET request to the API
   * @param {String} endpoint A valid endpoint from API.routes
   * @param {Object} params An object containing query params
   * @param {Function} onSuccess A callback function for success with one parameter that holds the JSON result
   * @param {Function} onError A callback function for error with one parameter that holds the error
   * @returns undefined
   */
  async get(endpoint, params, onSuccess, onError) {
    const route = this.routes[endpoint];
    if (!route) {
      console.error('[API] Post: Unknown endpoint');
      return null;
    }
    let search = '';
    if (params) {
      const searchParams = Array.from(Object.entries(params));
      if (searchParams.length > 0) {
        const tempSearch = new URLSearchParams();
        searchParams.forEach((param) => {
          tempSearch.set(param[0], param[1]);
        });
        search = `?${tempSearch.toString()}`;
      }
    }
    fetch(route + search, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Origin': location.origin
      }
    })
    .then((response) => {
      if (!response.ok) {
        throw response;
      }
      return response.json();
    })
    .then((result) => {
      if (onSuccess) onSuccess(result);
    })
    .catch((err) => {
      if (onError) onError(err);
    });
  }

  /**
   * Do a POST request to the API
   * @param {String} endpoint A valid endpoint from API.routes
   * @param {Object} data Payload
   * @param {Function} onSuccess A callback function for success with one parameter that holds the JSON result
   * @param {Function} onError A callback function for error with one parameter that holds the error
   * @returns Result or null
   */
  async post(endpoint, data, onSuccess, onError) {
    const route = this.routes[endpoint];
    if (!route) {
      console.error('[API] Post: Unknown endpoint');
      return null;
    }
    fetch(route, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Origin': location.origin,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })
    .then((response) => {
      if (!response.ok) {
        throw response;
      }
      return response.json();
    })
    .then((result) => {
      if (onSuccess) onSuccess(result);
    })
    .catch((err) => {
      if (onError) onError(err);
    });
  }

  /**
   * Do a GET request to the API returning a promise
   * @param {String} endpoint A valid endpoint from API.routes
   * @param {Object} params An object containing query params
   * @returns Result or null
   */
  async getPromise(endpoint, params) {
    return new Promise((resolve, reject) => {
      const route = this.routes[endpoint];
      if (!route) {
        console.error('[API] Post: Unknown endpoint');
        return null;
      }
      let search = '';
      if (params) {
        const searchParams = Array.from(Object.entries(params));
        if (searchParams.length > 0) {
          const tempSearch = new URLSearchParams();
          searchParams.forEach((param) => {
            tempSearch.set(param[0], param[1]);
          });
          search = `?${tempSearch.toString()}`;
        }
      }
      fetch(route + search, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Origin': location.origin
        }
      })
      .then((response) => {
        if (!response.ok) {
          throw response;
        }
        return response.json();
      })
      .then((result) => {
        resolve(result);
      })
      .catch((err) => {
        reject(null);
      });
    });
  }

  /**
   * Do a POST request to the API returning a promise
   * @param {String} endpoint A valid endpoint from API.routes
   * @param {Object} data Payload
   * @returns Result or null
   */
  async postPromise(endpoint, data) {
    return new Promise((resolve, reject) => {
      const route = this.routes[endpoint];
      if (!route) {
        console.error('[API] Post: Unknown endpoint');
        reject(null);
        return;
      }
      fetch(route, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Origin': location.origin,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })
      .then((response) => {
        if (!response.ok) {
          reject(null);
        }
        return response.json();
      })
      .then((result) => {
        resolve(result);
      })
      .catch((err) => {
        reject(null);
      });
    });
  }
}

window.api = new API();