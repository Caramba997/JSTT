const fs = require('fs');

class NPM {
  constructor() {
    const axios = require('axios');
    this.axios = axios.create();
  }

  async get(name) {
    try {
      const response = await this.axios.get(`https://registry.npmjs.org/${name}`);
      if (response.status === 404) return null;
      if (response.status !== 200) {
        console.log(response.data);
        return null;
      };
      return {
        name: response.data.name,
        description: response.data.description,
        author: response.data.author,
        modified: response.data.time.modified,
        created: response.data.time.created,
        versions: Object.keys(response.data.versions).length,
        repository: response.data.repository,
        homepage: response.data.homepage,
        keywords: response.data.keywords,
        maintainers: response.data.maintainers ? response.data.maintainers.length : 0,
        contributors: response.data.contributors ? response.data.contributors.length : 0,
        license: response.data.license
      };
    }
    catch (e) {
      return e;
    }
  }

  /**
   * Fetch all docs from NPM replicate
   * @param {string} filePath Path to output file
   */
  async getAllDocs(filePath) {
    return new Promise(async (resolve, reject) => {
      const totalLength = 360000000,
            startTime = Date.now();
      let currentLength = 0,
          lastUpdate = 0;
      try {
        const response = await this.axios.get('https://replicate.npmjs.com/_all_docs', {
          responseType: 'stream'
        });
        console.log('Start downloading all NPM package names');
        response.data.pipe(fs.createWriteStream(filePath));
        response.data.on('data', (chunk) => {
          currentLength += chunk.length;
          if ((currentLength / 10000) - lastUpdate > 1) {
            lastUpdate = currentLength / 10000;
            const now = Date.now(),
                  currentTime = now - startTime,
                  remainingTime = currentTime / currentLength * (totalLength - currentLength) / 1000,
                  remainingMins = Math.floor(remainingTime / 60),
                  remainingSecs = Math.round(remainingTime % 60);
            console.log(`${currentLength / 1000} kB / ~ ${totalLength / 1000} kB - ${remainingMins}:${remainingSecs >= 10 ? remainingSecs : `0${remainingSecs}`} remaining`);
          }
        });
        response.data.on('end', () => {
          const now = Date.now(),
                currentTime = (now - startTime) / 1000,
                mins = Math.floor(currentTime / 60),
                secs = Math.round(currentTime % 60);
          console.log(`Finished downloading in ${mins}:${secs >= 10 ? secs : `0${secs}`}`);
          resolve(true);
        });
      }
      catch (e) {
        reject(null);
      }
    });
  }

}

module.exports = { NPM };