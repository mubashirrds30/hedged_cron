"use strict";
const request = require("axios");

class requests {
  constructor(apiKey, options) {
    this.apiKey = apiKey;
    this.requestTimeout =
      options && options.requestTimeout ? options.requestTimeout : null;
  }

  getAuthHeaders() {
    return new Promise((resolve, reject) => {
      resolve(null);
    });
  }

  async processRequest(method, url, payLoad, queryString) {
    let header = await this.getAuthHeaders();
    var options = {
      method: method,
      data: payLoad,
      url: url,
      qs: queryString,
      headers: {
        "content-type": "application/json",
      },
      json: true,
    };

    if (header) {
      options.headers["Authorization"] = header;
    }
    if (this.requestTimeout) options.timeout = this.requestTimeout;

    let response = await request(options);
    return response && response.data ? response.data : response;
  }

  processPutRequest(url, payLoad, retries = 0) {
    return new Promise((resolve, reject) => {
      this.processRequest("PUT", url, payLoad)
        .then(resolve)
        .catch((err) => {
          if (err.error && err.error.message === "Unauthorized") {
            if (this.authEndPoint && this.login && retries < 2) {
              this.login().then(() => {
                retries++;
                return this.processPutRequest(url, payLoad, retries)
                  .then(resolve)
                  .catch(reject);
              });
            } else reject(err);
          } else {
            if (err.statusCode && err.statusCode === 500 && retries < 2) {
              retries++;
              return this.processPutRequest(url, payLoad, retries)
                .then(resolve)
                .catch(reject);
            } else reject(err);
          }
        });
    });
  }

  processPostRequest(url, payLoad, retries = 0) {
    return new Promise((resolve, reject) => {
      this.processRequest("POST", url, payLoad)
        .then(resolve)
        .catch((err) => {
          if (err.error && err.error.message === "Unauthorized") {
            if (this.authEndPoint && this.login && retries < 2) {
              this.login().then(() => {
                retries++;
                return this.processPostRequest(url, payLoad, retries)
                  .then(resolve)
                  .catch(reject);
              });
            } else reject(err);
          } else {
            if (err.statusCode && err.statusCode === 500 && retries < 2) {
              retries++;
              return this.processPostRequest(url, payLoad, retries)
                .then(resolve)
                .catch(reject);
            } else reject(err);
          }
        });
    });
  }

  processDeleteRequest(url, payLoad, retries = 0) {
    return new Promise((resolve, reject) => {
      this.processRequest("DELETE", url, payLoad)
        .then(resolve)
        .catch((err) => {
          if (err.error && err.error.message === "Unauthorized") {
            if (this.authEndPoint && this.login && retries < 2) {
              this.login().then(() => {
                retries++;
                return this.processDeleteRequest(url, payLoad, retries)
                  .then(resolve)
                  .catch(reject);
              });
            } else reject(err);
          } else {
            if (err.statusCode && err.statusCode === 500 && retries < 2) {
              retries++;
              return this.processDeleteRequest(url, payLoad, retries)
                .then(resolve)
                .catch(reject);
            } else reject(err);
          }
        });
    });
  }

  processGetRequest(url, queryString, retries = 0) {
    return new Promise((resolve, reject) => {
      this.processRequest("GET", url, {}, queryString)
        .then(resolve)
        .catch((err) => {
          if (err.error && err.error.message === "Unauthorized") {
            if (this.authEndPoint && this.login && retries < 2) {
              this.login().then(() => {
                retries++;
                return this.processGetRequest(url, queryString, retries)
                  .then(resolve)
                  .catch(reject);
              });
            } else reject(err);
          } else {
            if (err.statusCode && err.statusCode === 500 && retries < 2) {
              retries++;
              return this.processGetRequest(url, queryString, retries)
                .then(resolve)
                .catch(reject);
            } else reject(err);
          }
        });
    });
  }
}

class onesignalRequests extends requests {
  constructor(apiKey) {
    super(apiKey);
  }

  getAuthHeaders() {
    return new Promise((resolve, reject) => {
      return resolve("Basic " + this.apiKey);
    });
  }
}

module.exports = Object.assign({}, { requests, onesignalRequests });
