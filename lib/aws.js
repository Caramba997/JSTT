const AWS = require('aws-sdk');
const dotenv = require('dotenv');
dotenv.config();

class AWSClient {
  constructor() {
    this.s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ID,
      secretAccessKey: process.env.AWS_SECRET,
      region: 'eu-central-1'
    });
    this.bucket = process.env.AWS_BUCKET;
  }

  async upload(filename, data) {
    return new Promise((resolve, reject) => {
      const params = {
        Bucket: this.bucket,
        Key: filename,
        Body: data
      };
      this.s3.upload(params, (err, data) => {
        if (err) reject(err);
        console.log('[AWS] Upload complete (' + filename + ')');
        resolve(data);
      });
    });
  }

  async download(filename) {
    return new Promise((resolve, reject) => {
      const params = {
        Bucket: this.bucket,
        Key: filename
      };
      this.s3.getObject(params, (err, data) => {
        if (err) reject(err);
        console.log('[AWS] Download complete (' + filename + ')');
        resolve(data.Body);
      });
    });
  }
}

module.exports = { AWSClient };