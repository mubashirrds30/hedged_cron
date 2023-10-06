"use strict";
const request = require("axios");
const { stockApi } = require("../_config/index");

class requests {
  constructor(useHeaders = true) {
    this.useHeaders = useHeaders;
  }

  getAuthHeaders() {
    return new Promise((resolve, reject) => {
      if (this.useHeaders) {
        resolve({
          [stockApi.apikeyname]: stockApi.apikey,
        });
      } else {
        resolve();
      }
    });
  }

  async processRequest(method, url, payLoad, queryString) {
    return await this.getAuthHeaders().then((headers) => {
      var options = {
        method: method,
        data: payLoad,
        url: url,
        params: queryString,
        headers: {
          "content-type": "application/json",
        },
        json: true,
      };

      if (headers) {
        options.headers = Object.assign({}, options.headers, headers);
      }

      return new Promise((resolve, reject) => {
        request(options)
          .then((response) => {
            return resolve(response.data);
          })
          .catch(reject);
      });
    });
  }

  processPutRequest(url, payLoad) {
    return this.processRequest("PUT", url, payLoad);
  }

  processPostRequest(url, payLoad) {
    return this.processRequest("POST", url, payLoad);
  }

  processDeleteRequest(url, payLoad) {
    return this.processRequest("DELETE", url, payLoad);
  }

  processGetRequest(url, queryString) {
    return this.processRequest("GET", url, {}, queryString);
  }
}

module.exports = Object.assign(
  {},
  {
    requests,
  }
);
